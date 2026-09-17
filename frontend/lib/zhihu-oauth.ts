// Zhihu OAuth (openapi.zhihu.com) authorization-code login — replaces the
// Google OAuth slot. Protocol per the Zhihu open-platform docs
// including the verified deviations:
// - authorize: GET {base}/authorize?redirect_uri&app_id&response_type=code&state
// - callback carries `authorization_code` (accept plain `code` as fallback)
// - token: POST {base}/access_token, form-urlencoded, field name stays `code`
// - user: GET {base}/user with `Authorization: Bearer <access_token>`
// - wrapped responses use business field `code: 20000` == success
// - `uid` is int64 and may exceed 2^53 -> extracted from raw JSON text losslessly
import crypto from "node:crypto";
import { prisma } from "./prisma";
import { AuthError, hashPassword, sessionPayload } from "./auth-core";

// ZHIHU_OAUTH_BASE_URL is a test seam: point it at a local mock to E2E the flow.
const BASE_URL = (process.env.ZHIHU_OAUTH_BASE_URL || "https://openapi.zhihu.com").replace(/\/+$/, "");
const STATE_TTL_MS = 10 * 60_000;
const STATE_COOKIE = "zh_oauth_state";
const FETCH_TIMEOUT_MS = 15_000;

export type ZhihuConfig = { appId: string; appKey: string; redirectUri: string };

async function setting(key: string): Promise<string> {
  const row = await prisma.settings.findUnique({ where: { key } }).catch(() => null);
  return (row?.value as string) || "";
}

// Config precedence: settings table (admin-editable) > env > built-in default.
export async function getZhihuConfig(): Promise<ZhihuConfig | null> {
  const appId = (await setting("zhihu_oauth_app_id")) || process.env.ZHIHU_OAUTH_APP_ID || "";
  const appKey = (await setting("zhihu_oauth_app_key")) || process.env.ZHIHU_OAUTH_APP_KEY || "";
  if (!appId || !appKey) return null;
  const redirectUri =
    (await setting("zhihu_oauth_redirect_uri")) ||
    process.env.ZHIHU_OAUTH_REDIRECT_URI ||
    "http://127.0.0.1:3000/api/auth/zhihu/callback";
  return { appId, appKey, redirectUri };
}

// --- CSRF state -----------------------------------------------------------
// In-process store: the whole stack runs in one Next process (see HANDOFF).
// The same value is also set as an HttpOnly cookie to bind the state to the
// browser session; the callback requires both to match and consumes the entry
// exactly once, so a replayed callback is rejected.
type StateRec = { expires: number; returnTo: string };
const STATES = new Map<string, StateRec>();

export function sanitizeReturnTo(to: string | null | undefined): string {
  // same-origin paths only; reject protocol-relative, absolute and exotic values
  if (!to || typeof to !== "string" || to.length > 200) return "/";
  if (!to.startsWith("/") || to.startsWith("//") || to.includes("\\") || /[\r\n]/.test(to)) return "/";
  return to;
}

export function createState(returnTo: string): string {
  const now = Date.now();
  for (const [k, v] of STATES) if (v.expires < now) STATES.delete(k);
  const s = crypto.randomBytes(24).toString("hex");
  STATES.set(s, { expires: now + STATE_TTL_MS, returnTo: sanitizeReturnTo(returnTo) });
  return s;
}

export function consumeState(s: string): StateRec | null {
  if (!s) return null;
  const rec = STATES.get(s);
  if (!rec) return null;
  STATES.delete(s); // one-time consumption
  return rec.expires >= Date.now() ? rec : null;
}

export const stateCookie = (s: string) =>
  // Secure flag intentionally omitted: local dev runs on plain http://127.0.0.1
  `${STATE_COOKIE}=${s}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax`;
export const stateCookieClear = () => `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly`;
export const readStateCookie = (cookieHeader: string | null): string =>
  cookieHeader?.match(new RegExp(`(?:^|; )${STATE_COOKIE}=([^;]+)`))?.[1] ?? "";

export function buildAuthorizeUrl(cfg: ZhihuConfig, state: string): string {
  const u = new URL(`${BASE_URL}/authorize`);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("app_id", cfg.appId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", state);
  return u.toString();
}

// --- Zhihu API ------------------------------------------------------------
type Json = Record<string, unknown>;

function unwrap(json: Json): Json {
  // wrapped shape: {code:20000, data:{...}} — 20000 means success (verified deviation)
  if ("code" in json && json.code !== undefined) {
    if (Number(json.code) !== 20000) {
      const detail =
        json.message || json.msg || (typeof json.data === "string" ? json.data : "") || `code ${json.code}`;
      throw new AuthError(502, "zhihu_error", `zhihu api error: ${detail}`);
    }
    return (json.data !== undefined ? json.data : json) as Json;
  }
  return json;
}

export type ZhihuToken = { access_token: string; token_type?: string; expires_in?: number };

export async function exchangeCode(cfg: ZhihuConfig, code: string): Promise<ZhihuToken> {
  const form = new URLSearchParams({
    app_id: cfg.appId,
    app_key: cfg.appKey,
    grant_type: "authorization_code",
    redirect_uri: cfg.redirectUri,
    code,
  });
  const res = await fetch(`${BASE_URL}/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  }).catch((e: Error) => {
    throw new AuthError(502, "zhihu_unreachable", `cannot reach zhihu token endpoint: ${e?.message || e}`);
  });
  const text = await res.text();
  let json: Json;
  try {
    json = JSON.parse(text) as Json;
  } catch {
    throw new AuthError(502, "zhihu_bad_response", `token endpoint returned non-JSON (HTTP ${res.status})`);
  }
  const data = unwrap(json) as Partial<ZhihuToken>;
  if (!data.access_token)
    throw new AuthError(502, "zhihu_token_failed", `token exchange failed (HTTP ${res.status})`);
  return data as ZhihuToken;
}

export type ZhihuUser = {
  uid: string;
  hash_id: string;
  fullname: string;
  gender?: string;
  headline?: string;
  avatar_path?: string;
  email?: string;
};

export async function fetchZhihuUser(accessToken: string): Promise<ZhihuUser> {
  const res = await fetch(`${BASE_URL}/user`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  }).catch((e: Error) => {
    throw new AuthError(502, "zhihu_unreachable", `cannot reach zhihu user endpoint: ${e?.message || e}`);
  });
  const text = await res.text();
  let json: Json;
  try {
    json = JSON.parse(text) as Json;
  } catch {
    throw new AuthError(502, "zhihu_bad_response", `user endpoint returned non-JSON (HTTP ${res.status})`);
  }
  const data = unwrap(json) as Record<string, unknown>;
  // int64 uid: take it from the raw text so JSON.parse precision loss never applies
  const uid = text.match(/"uid"\s*:\s*"?(\d+)"?/)?.[1] || (data.uid != null ? String(data.uid) : "");
  const hashId = data.hash_id ? String(data.hash_id) : "";
  if (!uid && !hashId)
    throw new AuthError(502, "zhihu_user_failed", `user info failed (HTTP ${res.status})`);
  return {
    uid,
    hash_id: hashId,
    fullname: data.fullname ? String(data.fullname) : "",
    gender: data.gender ? String(data.gender) : undefined,
    headline: data.headline ? String(data.headline) : undefined,
    avatar_path: data.avatar_path ? String(data.avatar_path) : undefined,
    email: data.email ? String(data.email).trim().toLowerCase() : undefined,
  };
}

// --- local account provisioning --------------------------------------------
const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");

export async function loginZhihuUser(zh: ZhihuUser, token: ZhihuToken) {
  const key = zh.uid || zh.hash_id;
  if (!key) throw new AuthError(502, "zhihu_user_failed", "zhihu user has no usable identifier");
  const expiresAt = token.expires_in ? Date.now() / 1000 + Number(token.expires_in) : null;

  const identity = await prisma.zhihuIdentities.findUnique({ where: { zhihu_uid: key } });
  let row = identity ? await prisma.users.findUnique({ where: { id: identity.user_id } }) : null;
  // merge: zhihu returned a real email that an existing local account already uses
  if (!row && zh.email) row = await prisma.users.findFirst({ where: { email: zh.email } });
  if (!row) {
    // password-less account (same shape as loginOrCreateOtp): random unusable
    // password, password_set=false; synthetic email keeps the not-null contract
    const { digest, salt, iters } = hashPassword(crypto.randomBytes(16).toString("hex"));
    const uid = crypto.randomUUID();
    const now = nowIso();
    const safeKey = key.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);
    const email = zh.email || `zhihu_${safeKey}@oauth.sweetwine.local`;
    await prisma.users.create({
      data: {
        id: uid,
        email,
        nickname: (zh.fullname || `zhihu_${key.slice(0, 8)}`).slice(0, 24),
        gender: zh.gender === "female" ? "female" : "male",
        referralCode: crypto.randomBytes(4).toString("hex").toUpperCase(),
        createdAt: now,
        updatedAt: now,
        pass_hash: digest,
        salt,
        iters,
        password_set: false,
      } as never,
    });
    row = await prisma.users.findUnique({ where: { id: uid } });
  }
  if (!row) throw new AuthError(500, "internal", "failed to provision local user");

  const now = nowIso();
  const fields = {
    hash_id: zh.hash_id || null,
    user_id: row.id as string,
    fullname: zh.fullname || null,
    avatar_path: zh.avatar_path || null,
    access_token: token.access_token, // server-side only; never exposed to the client
    token_expires_at: expiresAt,
    updated_at: now,
  };
  if (identity) await prisma.zhihuIdentities.update({ where: { zhihu_uid: key }, data: fields });
  else await prisma.zhihuIdentities.create({ data: { zhihu_uid: key, created_at: now, ...fields } });

  return sessionPayload(row as Record<string, unknown>);
}

// --- admin console helpers ---------------------------------------------------
export function zhihuConfigStatus(cfg: ZhihuConfig | null) {
  return cfg
    ? { configured: true, app_id: cfg.appId, redirect_uri: cfg.redirectUri }
    : { configured: false, app_id: "", redirect_uri: "" };
}

// Connectivity probe for the admin "测试连接" button: sends a deliberately fake
// authorization code to the token endpoint. A rejection response still proves
// the endpoint is reachable and the platform processed the credentials.
export async function zhihuOAuthTest() {
  const cfg = await getZhihuConfig();
  if (!cfg)
    return {
      ok: false,
      reason: "not_configured",
      message: "app_id/app_key 未配置（settings 表与 env 均为空）",
    };
  const out: Record<string, unknown> = {
    ok: false,
    ...zhihuConfigStatus(cfg),
    authorize_url_sample: `${buildAuthorizeUrl(cfg, "probe-state")}`.slice(0, 200),
  };
  try {
    const form = new URLSearchParams({
      app_id: cfg.appId,
      app_key: cfg.appKey,
      grant_type: "authorization_code",
      redirect_uri: cfg.redirectUri,
      code: "connectivity_probe",
    });
    const res = await fetch(`${BASE_URL}/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const text = await res.text();
    out.probe_status = res.status;
    out.probe_body = text.slice(0, 300);
    let json: Json | null = null;
    try {
      json = JSON.parse(text) as Json;
    } catch {
      /* non-JSON probe response */
    }
    if (json?.access_token) {
      out.ok = true;
      out.reason = "token_issued";
      out.message = "token 端点直接签发了 token（本地 mock 模式？）";
    } else if (res.status < 500) {
      out.ok = true;
      out.reason = "reachable";
      out.message = "端点可达，平台已处理凭证并拒绝探测用假授权码（预期行为）；真实登录仍需用户在知乎授权页确认";
    } else {
      out.reason = "probe_server_error";
      out.message = `token 端点返回 HTTP ${res.status}`;
    }
  } catch (e) {
    out.reason = "unreachable";
    out.message = `无法连接 ${BASE_URL}: ${(e as Error)?.message || e}`;
  }
  return out;
}

// --- error page (the OAuth flow is a full-page redirect, so errors render HTML) ---
export function oauthErrorPage(status: number, title: string, detail: string): Response {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head><body style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0b0b0f;color:#eee"><div style="text-align:center;max-width:520px;padding:24px"><h1 style="font-size:20px;margin-bottom:12px">${esc(title)}</h1><p style="color:#999;font-size:14px;line-height:1.7">${esc(detail)}</p><p style="margin-top:20px"><a href="/" style="color:#ff6eb3;text-decoration:none;font-size:14px">返回首页 · Back to SweetWine</a></p></div></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
