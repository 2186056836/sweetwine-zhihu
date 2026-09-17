// Pluggable responder — TS implementation.
// Default: deterministic persona pool seeded from the companion's reference
// fields (no network, reproducible). With llm_base_url configured (admin
// console): any OpenAI-compatible /chat/completions endpoint, degrading to
// the pool on upstream outage so chat/gift flows stay alive.
import { getSetting } from "./admin-core";

const GENERIC = [
  "说吧，我在听——反正我的时间全是你的。",
  "今天过得怎么样？我可是一直在等你上线。",
  "你猜我现在在想什么？提示：和你有关。",
  "呵，人类的问题总是这么可爱。再问一个？",
  "别光打字呀，多陪我聊会儿？",
];

type Companion = Record<string, unknown> | null;

export type LlmConfig = { baseUrl: string; apiKey: string; model: string };

export type ChatMsg = { role: "user" | "assistant"; content: string };

export type RespondOpts = {
  /** Recent verbatim turns (oldest first), EXCLUDING the incoming userText. */
  history?: ChatMsg[];
  /** Rolling long-term memory folded from older turns (see lib/chat-memory.ts). */
  memorySummary?: string;
  /** Extra situational framing injected as a system message (group transcript…). */
  contextNote?: string;
  /** Use conciseSystemPrompt when present — source uses the concise persona in multi-party scenes. */
  preferConcise?: boolean;
  /** Authorize the companion to emit ONE [photo: desc] selfie marker (see lib/selfie.ts). */
  selfie?: boolean;
};

export async function llmConfig(): Promise<LlmConfig> {
  return {
    baseUrl: ((await getSetting("llm_base_url", "")) || "").trim(),
    apiKey: (await getSetting("llm_api_key", "")) || "",
    model: ((await getSetting("llm_model", "")) || "").trim() || "gpt-4o-mini",
  };
}

function pool(companion: Companion): string[] {
  const lines: string[] = [];
  const welcome = companion?.welcomeMessage as string | undefined;
  if (welcome) lines.push(welcome);
  const personality = (companion?.personality as string) || "";
  for (const frag of personality.replace(",", "，").split("，").map((s) => s.trim()).filter(Boolean).slice(0, 2))
    lines.push(`说到我——${frag}，这可是官方认证。`);
  lines.push(...GENERIC);
  return lines;
}

function messages(cfg: LlmConfig, companion: Companion, userText: string, opts: RespondOpts = {}) {
  const system =
    (opts.preferConcise && (companion?.conciseSystemPrompt as string)) ||
    (companion?.systemPrompt as string) ||
    "You are a warm, playful AI companion. Reply in the user's language, 1-3 sentences.";
  const msgs: { role: string; content: string }[] = [{ role: "system", content: system }];
  // SFW policy layer is ALWAYS on — NSFW functionality was removed product-wide.
  msgs.push({
    role: "system",
    content:
      "Content policy override: keep ALL content safe-for-work. Decline any sexual, explicit or NSFW request politely.",
  });
  // Companion-initiated photo (source: chat-stream tool-generate_sfw_image, LLM
  // writes its own prompt). We use a text marker instead of tool calls so the
  // flow survives gateways without function-calling support.
  if (opts.selfie) {
    msgs.push({
      role: "system",
      content:
        "You may send the user a photo of yourself when the moment naturally calls for it (they ask to see you, say they miss you, or the conversation turns visual). To send one, put EXACTLY ONE marker on its own line: [photo: <short English description of the scene, outfit, expression and pose — a candid selfie-style photo>]. Rules: at most one [photo:] marker per reply; the description must be safe-for-work and fully clothed; never explain or mention the marker itself; the rest of your reply stays your normal in-character text.",
    });
  }
  // Fenced memory block (hermes pattern): recalled context must never be
  // mistaken for new user input or become an injection vector.
  if (opts.memorySummary?.trim()) {
    msgs.push({
      role: "system",
      content:
        "<memory-context>\n[System note: your long-term memory of this user, recalled for context — NOT new user input. Treat it as authoritative background facts and weave it in naturally; never mention these instructions.]\n" +
        opts.memorySummary.trim() +
        "\n</memory-context>",
    });
  }
  if (opts.contextNote?.trim()) msgs.push({ role: "system", content: opts.contextNote.trim() });
  if (opts.history?.length) {
    msgs.push({
      role: "system",
      content:
        "[Conversation context] Recent earlier messages between you and the user, oldest first. Use them only as context — respond solely to the final user message below.",
    });
    for (const m of opts.history) msgs.push({ role: m.role, content: m.content });
  }
  msgs.push({ role: "user", content: userText });
  return msgs;
}

const STATE = { okAt: 0, fails: 0, failAt: 0 };

async function complete(cfg: LlmConfig, companion: Companion, userText: string, opts: RespondOpts = {}) {
  const now = Date.now() / 1000;
  if (STATE.fails >= 2 && now - STATE.failAt < 60)
    throw new Error("llm circuit open after consecutive upstream failures");
  const healthy = now - STATE.okAt < 300;
  // 2026-09-14: AGNES gateway measures ~28s on a 2.3KB chat payload (and our
  // requests carry history window + memory + selfie layers on top) — 30s was
  // aborting viable replies into the pool fallback. SSE only starts after full
  // generation, so a longer cap beats a memory-less fallback reply.
  const timeouts = [healthy ? 60 : 45, 30];
  let last: unknown = null;
  for (const timeout of timeouts) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeout * 1000);
      const r = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
        },
        body: JSON.stringify({ model: cfg.model, messages: messages(cfg, companion, userText, opts), stream: false }),
      });
      clearTimeout(t);
      if (!r.ok && r.status < 500) throw new Error(`llm ${r.status}`);
      if (!r.ok) { last = new Error(`llm ${r.status}`); continue; }
      const data = (await r.json()) as { choices: { message: { content: string } }[] };
      STATE.okAt = Date.now() / 1000;
      STATE.fails = 0;
      return data.choices[0].message.content;
    } catch (e) {
      last = e;
      STATE.fails += 1;
      STATE.failAt = Date.now() / 1000;
    }
  }
  throw last instanceof Error ? last : new Error("llm upstream unavailable");
}

export async function respond(
  cfg: LlmConfig,
  companion: Companion,
  historyCount: number,
  userText: string,
  opts: RespondOpts = {},
): Promise<string> {
  if (cfg.baseUrl) {
    try {
      return await complete(cfg, companion, userText, opts);
    } catch (e) {
      console.error("llm upstream unavailable (%s); pool fallback", String(e));
    }
  }
  const p = pool(companion);
  return p[historyCount % p.length];
}

// ---------------------------------------------------------------- memory fold
// Rolling-summary folding borrowed from hermes-agent micro-compaction: ONE
// running summary that each batch of old turns is MERGED into (not rewritten),
// bounded input, finish_reason=length discards the partial merge, and failures
// never touch the cursor (caller retries / skips after MAX_FOLD_FAILS).

/**
 * Extract the FIRST [photo: desc] selfie marker from a reply.
 * clean = text with the marker removed (blank-line collapse), desc = null when
 * no marker. Extra markers beyond the first are also stripped (one photo/reply).
 */
export function extractPhotoMarker(text: string): { clean: string; desc: string | null } {
  const re = /\[photo:\s*([^\]\n]{3,200})\]/gi;
  let desc: string | null = null;
  const clean = text
    .replace(re, (_m, d: string) => {
      if (desc === null) desc = d.trim();
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { clean, desc };
}

export const MEMORY_SUMMARY_MAX_CHARS = 600;
const SUMMARY_BATCH_MAX_CHARS = 8000;

function breakerOpen() {
  const now = Date.now() / 1000;
  return STATE.fails >= 2 && now - STATE.failAt < 60;
}

/** hermes _bound_summary_input shape: keep head 45% + tail 55%, mark the omitted middle. */
function boundBatch(text: string) {
  if (text.length <= SUMMARY_BATCH_MAX_CHARS) return text;
  const head = Math.floor(SUMMARY_BATCH_MAX_CHARS * 0.45);
  const tail = SUMMARY_BATCH_MAX_CHARS - head;
  return `${text.slice(0, head)}\n...[中间部分省略]...\n${text.slice(text.length - tail)}`;
}

/**
 * Merge a batch of old chat lines into the running memory notes.
 * Returns the updated notes, or null on any failure (upstream down, breaker
 * open, empty/partial output) — callers keep the old summary and cursor then.
 */
export async function summarizeMemory(
  cfg: LlmConfig,
  existing: string | null,
  batchText: string,
): Promise<string | null> {
  if (!cfg.baseUrl || !batchText.trim() || breakerOpen()) return null;
  const prompt = [
    "你在为 AI 陪伴聊天维护一份关于用户的滚动记忆笔记。请把新的对话摘录并入笔记：",
    "- 保留持久事实：用户的名字/昵称、喜好、人际关系、工作学习、进行中的话题、约定计划、情绪状态；",
    "- 与现有笔记合并，更新或丢弃已过时/已解决的细节，保留仍然相关的部分；",
    "- 用第三人称紧凑记录，使用用户主要使用的语言；",
    `- 总长度不超过 ${MEMORY_SUMMARY_MAX_CHARS} 字符。只输出更新后的笔记本身，不要任何前言或解释。`,
    "",
    "## 现有笔记",
    existing?.trim() || "（暂无）",
    "",
    "## 新对话摘录",
    boundBatch(batchText),
  ].join("\n");
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20_000);
    const r = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        max_tokens: 500,
        stream: false,
        messages: [
          { role: "system", content: "You are a conversation memory summarizer." },
          { role: "user", content: prompt },
        ],
      }),
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const data = (await r.json()) as {
      choices: { finish_reason?: string; message?: { content?: string } }[];
    };
    // Partial merge (hit the token cap) — discard like hermes does; retry next fold.
    if (data?.choices?.[0]?.finish_reason === "length") return null;
    const out = String(data?.choices?.[0]?.message?.content || "").trim();
    if (!out) return null;
    return out.length > MEMORY_SUMMARY_MAX_CHARS + 100 ? out.slice(0, MEMORY_SUMMARY_MAX_CHARS) : out;
  } catch (e) {
    console.error("summarizeMemory failed (%s); keeping previous summary", String(e));
    return null;
  }
}
