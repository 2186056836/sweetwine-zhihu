// Zhihu OAuth step 2 — registered callback (ZHIHU_OAUTH_REDIRECT_URI).
// Verifies the CSRF state (HttpOnly cookie + one-time server store), exchanges
// `authorization_code` for an access token, fetches the zhihu profile, binds or
// creates the local user (zhihu_identities), then sets the same session cookies
// as password/OTP login so supabase-js picks the session up from the cookie.
import { NextRequest } from "next/server";
import { AuthError, cookieHeaders } from "@/lib/auth-core";
import {
  consumeState,
  exchangeCode,
  fetchZhihuUser,
  getZhihuConfig,
  loginZhihuUser,
  oauthErrorPage,
  readStateCookie,
  stateCookieClear,
} from "@/lib/zhihu-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  try {
    const cfg = await getZhihuConfig();
    if (!cfg) throw new AuthError(503, "not_configured", "服务端未配置知乎 OAuth app_id/app_key");

    const state = q.get("state") || "";
    if (!state || state !== readStateCookie(req.headers.get("cookie")))
      throw new AuthError(400, "state_mismatch", "state 与浏览器会话不一致，请重新发起知乎登录");
    const rec = consumeState(state);
    if (!rec)
      throw new AuthError(400, "state_expired", "登录请求已过期或已被使用，请重新发起知乎登录");

    // verified deviation: the callback carries `authorization_code`; also accept `code`
    const code = q.get("authorization_code") || q.get("code") || "";
    if (!code) throw new AuthError(400, "missing_code", "回调缺少授权码（可能取消了授权）");

    const token = await exchangeCode(cfg, code);
    const zhUser = await fetchZhihuUser(token.access_token);
    const payload = await loginZhihuUser(zhUser, token);

    const res = new Response(null, { status: 302, headers: { Location: rec.returnTo || "/" } });
    for (const c of cookieHeaders(payload)) res.headers.append("Set-Cookie", c);
    res.headers.append("Set-Cookie", stateCookieClear());
    return res;
  } catch (e) {
    if (!(e instanceof AuthError)) console.error("[zhihu-oauth]", e);
    const status = e instanceof AuthError && e.status >= 400 && e.status <= 599 ? e.status : 500;
    const msg = e instanceof AuthError ? e.message : "内部错误 · internal error";
    return oauthErrorPage(status, "知乎登录失败 · Zhihu sign-in failed", msg);
  }
}
