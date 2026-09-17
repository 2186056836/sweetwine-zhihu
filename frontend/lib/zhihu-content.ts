// Zhihu open-platform content client (server-side).
// Wire contract per zhihu skill references/http-api.md (verified 2026-09):
// Bearer <Access Secret> + X-Request-Timestamp (unix seconds), Code/Message/Data envelope.
// Quota on this (unverified) tenant is TIGHT — zhihu_search 10/day, hot_list 2/day,
// question_answers 10/day — so every paid call goes through a TTL cache and the
// campus UI surfaces remaining quota from the free /quota endpoint.
import { getSetting } from "./admin-core";

const BASE = "https://developer.zhihu.com";

export type ZhItem = {
  Title: string;
  ContentType?: string;
  ContentID?: string;
  ContentText?: string;
  Url: string;
  CommentCount?: number;
  VoteUpCount?: number;
  AuthorName?: string;
  AuthorAvatar?: string;
  Summary?: string;
};

async function secret(): Promise<string> {
  return ((await getSetting("zhihu_access_secret", "")) || process.env.ZHIHU_ACCESS_SECRET || "").trim();
}

async function zhGet(path: string, params: Record<string, string>): Promise<{ Code: number; Message: string; Data: any }> {
  const key = await secret();
  if (!key) throw new Error("ZHIHU_NOT_CONFIGURED");
  const qs = new URLSearchParams(params).toString();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const r = await fetch(`${BASE}${path}?${qs}`, {
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
        "Content-Type": "application/json",
      },
    });
    const j = (await r.json()) as { Code: number; Message: string; Data: any };
    if (j.Code === 20001) throw new Error("ZHIHU_AUTH_FAILED");
    if (j.Code === 30001) throw new Error("ZHIHU_RATE_LIMITED");
    if (j.Code !== 0) throw new Error(`ZHIHU_${j.Code}:${j.Message}`);
    return j;
  } finally {
    clearTimeout(t);
  }
}

// ---- TTL cache (process-local; resets on restart, quota-safe by design) ----
const cache = new Map<string, { at: number; val: unknown }>();
function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.val as T);
  return load().then((val) => {
    cache.set(key, { at: Date.now(), val });
    return val;
  });
}
const H1 = 3_600_000;
const H12 = 43_200_000;

/** Zhihu in-site search (zhihu_search quota). */
export function searchZhihu(query: string, count = 8): Promise<ZhItem[]> {
  const q = query.trim();
  if (!q) return Promise.resolve([]);
  return cached(`search:${q}:${count}`, H1, async () => {
    const j = await zhGet("/api/v1/content/zhihu_search", { Query: q, Count: String(Math.min(10, Math.max(1, count))) });
    return (j.Data?.Items || []) as ZhItem[];
  });
}

/** Zhihu hot list (hot_list quota = 2/day on this tenant → 12h cache). */
export function hotList(limit = 10): Promise<{ Title: string; Url: string; Summary: string; ThumbnailUrl: string }[]> {
  return cached(`hot:${limit}`, H12, async () => {
    const j = await zhGet("/api/v1/content/hot_list", { Limit: String(Math.min(30, Math.max(1, limit))) });
    return (j.Data?.Items || []) as { Title: string; Url: string; Summary: string; ThumbnailUrl: string }[];
  });
}

/** Answer summaries under a question (question_answers quota). Summary ≠ full text. */
export function questionAnswers(questionUrl: string, limit = 6): Promise<ZhItem[]> {
  const u = questionUrl.trim();
  if (!u.startsWith("https://www.zhihu.com/question/")) return Promise.resolve([]);
  return cached(`answers:${u}:${limit}`, H1, async () => {
    const j = await zhGet("/api/v1/content/question_answers", {
      QuestionUrl: u,
      Offset: "0",
      Limit: String(Math.min(50, Math.max(1, limit))),
    });
    return (j.Data?.Items || []) as ZhItem[];
  });
}

/** Remaining daily quota (free endpoint; light 5-min cache). */
export function quota(): Promise<{ APIID: string; APIName: string; TotalQuota: number; TotalUsed: number; RemainingQuota: number }[]> {
  return cached("quota", 300_000, async () => {
    const j = await zhGet("/api/v1/quota", {});
    return (j.Data || []) as { APIID: string; APIName: string; TotalQuota: number; TotalUsed: number; RemainingQuota: number }[];
  });
}

export function isConfigured(): Promise<boolean> {
  return secret().then((s) => !!s);
}
