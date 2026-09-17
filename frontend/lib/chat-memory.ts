// Conversation history window + rolling long-term memory for 1v1 chats.
// Design borrowed from hermes-agent micro-compaction: a protected recent window
// stays verbatim while older turns are folded (MERGED, not rewritten) into ONE
// rolling summary persisted on conversationStates. The fold cursor
// (memoryMsgCount) only advances on a successful merge; after MAX_FOLD_FAILS
// consecutive failures the batch is skipped so a dead summarizer never wedges
// memory or re-bills the same fold every turn.
import { prisma } from "./prisma";
import { countMessages } from "./repos";
import { llmConfig, summarizeMemory, type ChatMsg, type LlmConfig } from "./llm";

export const HISTORY_WINDOW = 24; // verbatim recent messages injected per turn
const FOLD_BATCH = 20; // fold once the un-absorbed backlog exceeds window+batch
export const FOLD_TRIGGER = HISTORY_WINDOW + FOLD_BATCH;
const MSG_CAP = 500; // per-message char cap inside the injected window
const MAX_FOLD_FAILS = 3; // hermes: skip the stuck exchange after 3 failures

const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");

/** Fold media payloads to placeholders (hermes _strip_historical_media analogue) and cap length. */
export function foldMedia(content: string): string {
  let t = String(content || "");
  t = t.replace(
    /^\[media-request:(image|video)\]([\s\S]*)\[\/media-request\]$/,
    (_m, kind: string, p: string) => `[${kind === "video" ? "视频" : "图片"}请求] ${p.slice(0, 120)}`,
  );
  if (/^!\[[^\]]*\]\([^)]*\)\s*$/.test(t.trim())) return "[图片]";
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, "[图片]");
  return t.length > MSG_CAP ? `${t.slice(0, MSG_CAP)}…` : t;
}

function stateId(userId: string, cid: string) {
  return `cs-${userId.slice(0, 8)}-${cid}`;
}

type StateData = { memorySummary?: string | null; memoryMsgCount?: number; memoryFoldFails?: number };

async function saveState(userId: string, cid: string, data: StateData) {
  const id = stateId(userId, cid);
  await prisma.conversationStates.upsert({
    where: { id },
    create: {
      id,
      userId,
      companionId: cid,
      memorySummary: data.memorySummary ?? null,
      memoryMsgCount: data.memoryMsgCount ?? 0,
      memoryFoldFails: data.memoryFoldFails ?? 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    } as never,
    update: { ...data, updatedAt: nowIso() } as never,
  });
}

export type ChatMemory = {
  /** Folded long-term memory, or null when nothing has been absorbed yet. */
  summary: string | null;
  /** Recent verbatim turns (oldest first), EXCLUDING the incoming message. */
  history: ChatMsg[];
  /** Stored message count BEFORE the incoming message is appended. */
  count: number;
};

/**
 * Load the memory state for (user, companion), fold the backlog when it has
 * grown past FOLD_TRIGGER, and return everything respond() needs. Call BEFORE
 * appendMessage(user) so the incoming text is not double-counted in history.
 * Folding is best-effort: any failure leaves summary/cursor untouched and the
 * turn proceeds with the plain recent window.
 */
export async function loadChatMemory(
  userId: string,
  cid: string,
  cfg?: LlmConfig,
): Promise<ChatMemory> {
  const conf = cfg ?? (await llmConfig());
  const [state, rows, total] = await Promise.all([
    prisma.conversationStates.findUnique({ where: { id: stateId(userId, cid) } }).catch(() => null),
    prisma.$queryRawUnsafe<{ role: string; content: string }[]>(
      `SELECT role, content FROM messages WHERE "companionId"=$1 AND "userId"=$2 ORDER BY "createdAt" DESC, id DESC LIMIT $3`,
      cid, userId, FOLD_TRIGGER + HISTORY_WINDOW,
    ),
    countMessages(cid, userId),
  ]);
  const db = rows.reverse(); // oldest first
  let summary = (state?.memorySummary as string | null) ?? null;
  let folded = Number(state?.memoryMsgCount ?? 0);
  let fails = Number(state?.memoryFoldFails ?? 0);
  if (folded > total) folded = total; // messages were deleted under the cursor

  const pending = total - folded;
  if (conf.baseUrl && pending >= FOLD_TRIGGER) {
    // Absorb everything except the protected recent window (hermes: tail stays verbatim).
    const absorbCount = Math.min(pending - HISTORY_WINDOW, db.length);
    if (absorbCount > 0) {
      const batch = db
        .slice(0, absorbCount)
        .map((m) => `${m.role === "user" ? "用户" : "角色"}: ${foldMedia(String(m.content || ""))}`)
        .join("\n");
      const merged = await summarizeMemory(conf, summary, batch);
      if (merged !== null) {
        summary = merged;
        folded += absorbCount;
        fails = 0;
        await saveState(userId, cid, { memorySummary: summary, memoryMsgCount: folded, memoryFoldFails: 0 });
      } else {
        fails += 1;
        if (fails >= MAX_FOLD_FAILS) {
          // Skip the stuck batch: advance the cursor to keep only the window un-absorbed.
          folded = Math.max(folded, total - HISTORY_WINDOW);
          fails = 0;
        }
        await saveState(userId, cid, { memoryFoldFails: fails, memoryMsgCount: folded });
      }
    }
  }

  const history: ChatMsg[] = db
    .slice(-HISTORY_WINDOW)
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: foldMedia(String(m.content || "")),
    }))
    .filter((m) => m.content.trim().length > 0);
  return { summary, history, count: total };
}

/**
 * deleteCompanionMemory semantics: messages stay, the companion forgets.
 * Reset the summary AND pin the cursor to the current message count so the old
 * stored turns are never re-folded into a fresh memory — only future turns are
 * absorbed again. A plain row delete would restart the cursor at 0 and rebuild
 * the "deleted" memory on the very next message.
 */
export async function resetChatMemory(userId: string, cid: string) {
  const total = await countMessages(cid, userId);
  await prisma.conversationStates.deleteMany({
    where: { userId, companionId: cid, NOT: { id: stateId(userId, cid) } },
  });
  await saveState(userId, cid, { memorySummary: null, memoryMsgCount: total, memoryFoldFails: 0 });
}
