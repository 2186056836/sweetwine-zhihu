// Agnes AI gateway client (image generation).
// Wire contract per AGNES_API_调用文档.md (实测版 v2): sync image endpoint,
// url mode only, anonymous output downloads, retry/backoff on gateway flaps.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getSetting } from "./admin-core";

export const DEFAULT_BASE = "https://ai.maoming.me";
export const DEFAULT_KEY = process.env.AGNES_API_KEY || ""; // set via .env / server env
export const IMAGE_MODEL = "agnes-image-2.5-flash";

export const ASPECT_SIZES: Record<string, string> = {
  "1:1": "1024x1024", "3:4": "768x1024", "4:3": "1024x768",
  "16:9": "1280x720", "9:16": "720x1280", "21:9": "1680x720",
};

const MINOR_PATTERNS = ["girl", "teen", "minor", "child", "kid", "loli", "shota", "女孩", "少女", "未成年", "儿童", "萝莉"];

export function promptBlockedMinor(prompt: string) {
  const low = (prompt || "").toLowerCase();
  if (MINOR_PATTERNS.some((w) => low.includes(w))) return true;
  return /\b(1[0-7]|[1-9])\s*(岁|year|yo)\b/.test(low);
}

export async function cfgValues() {
  const base = ((await getSetting("agnes_base_url")) || DEFAULT_BASE).replace(/\/$/, "");
  const key = (await getSetting("agnes_api_key")) || DEFAULT_KEY;
  const enabled = ((await getSetting("agnes_enabled", "1")) || "1") === "1";
  return { base, key, enabled };
}

async function req(base: string, key: string, method: string, p: string, payload?: unknown, timeout = 120_000, retries = 3) {
  let last: { status: number; body: string } = { status: -1, body: "" };
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeout);
      const r = await fetch(base + p, {
        method,
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      clearTimeout(t);
      const body = await r.text();
      if (r.status === 503 && body.includes("video_queue_full") && attempt < retries - 1) {
        last = { status: r.status, body };
        await new Promise((res) => setTimeout(res, 20_000));
        continue;
      }
      return { status: r.status, body };
    } catch {
      last = { status: -1, body: "" };
      if (attempt < retries - 1) await new Promise((res) => setTimeout(res, 5000 * (attempt + 1)));
    }
  }
  return last;
}

export async function download(url: string, dest: string, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const r = await fetch(url); // anonymous: Authorization header causes 401
      if (!r.ok) throw new Error(String(r.status));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
      return true;
    } catch {
      if (attempt < retries - 1) await new Promise((res) => setTimeout(res, 5000 * (attempt + 1)));
    }
  }
  return false;
}

export async function generateImage(
  prompt: string,
  size = "1K",
  inputImages?: string[],
  // in-chat paths (selfie) bound latency: single attempt, short timeout
  opts?: { timeoutMs?: number; retries?: number },
) {
  const { base, key, enabled } = await cfgValues();
  if (!enabled) throw new Error("agnes disabled");
  const payload: Record<string, unknown> = {
    model: IMAGE_MODEL, prompt, size, extra_body: { response_format: "url" },
  };
  if (inputImages) (payload.extra_body as Record<string, unknown>).image = inputImages;
  const { status, body } = await req(base, key, "POST", "/v1/images/generations", payload, opts?.timeoutMs ?? 360_000, opts?.retries ?? 3);
  if (status !== 200) throw new Error(`agnes image ${status}: ${body.slice(0, 200)}`);
  const j = JSON.parse(body) as { data?: { url?: string }[] };
  const url = j.data?.[0]?.url;
  if (!url) throw new Error("agnes image: no url in response");
  return url;
}

/**
 * reference-design hidden assembly layer analogue: prepend structured identity
 * fields to free-text prompts so repeated generations stay the same character.
 * (Image-reference input is wired but the AGNES route ignores it — prompt-level
 * identity is the consistency mechanism that actually works today.)
 */
export function identityPrefix(comp: Record<string, unknown>): string {
  const s = (k: string) => String(comp[k] ?? "").trim();
  const bits = [
    s("name"),
    s("age") ? `${Number(comp.age)}-year-old` : "",
    s("ethnicity"),
    s("body"),
    s("occupation"),
  ].filter(Boolean);
  return bits.length ? `consistent character — ${bits.join(", ")}; same face and hairstyle as always; ` : "";
}

/**
 * Legacy-seeded companion asset path -> public origin URL for AGNES reference
 * input (AGNES can only fetch PUBLIC urls). Origin is configured via
 * COMPANION_ASSET_ORIGIN; unset => references disabled (generation still works,
 * just unreferenced). Returns null for assets not under the media prefix.
 */
export function publicSourceUrl(local: string | null | undefined): string | null {
  const origin = (process.env.COMPANION_ASSET_ORIGIN || "").replace(/\/$/, "");
  if (!origin) return null;
  const m = String(local || "").match(/^\/media\/store-b\/(.+)$/);
  if (!m) return null;
  return `${origin}/storage/v1/object/public/${m[1].split("/").map(encodeURIComponent).join("/")}`;
}

export const imageRel = (remote: string) => {
  const h = crypto.createHash("sha256").update(remote).digest("hex").slice(0, 16);
  const ext = path.extname(remote.split("?")[0]) || ".png";
  return `generated/${h}${ext}`;
};
