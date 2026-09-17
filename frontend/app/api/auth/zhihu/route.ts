// Zhihu OAuth step 1 — start the authorization-code login.
// GET /api/auth/zhihu[?return_to=/zh-Hans/...] -> 302 to the Zhihu authorize
// page with a one-time state (server store + HttpOnly cookie binding).
import { NextRequest } from "next/server";
import {
  buildAuthorizeUrl,
  createState,
  getZhihuConfig,
  oauthErrorPage,
  sanitizeReturnTo,
  stateCookie,
} from "@/lib/zhihu-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cfg = await getZhihuConfig().catch(() => null);
  if (!cfg)
    return oauthErrorPage(
      503,
      "知乎登录未配置 · Zhihu OAuth not configured",
      "服务端缺少 app_id/app_key。请在 frontend/.env 配置 ZHIHU_OAUTH_APP_ID 与 ZHIHU_OAUTH_APP_KEY（或在 settings 表写入 zhihu_oauth_app_id / zhihu_oauth_app_key），回调地址默认 http://127.0.0.1:3000/api/auth/zhihu/callback，可用 zhihu_oauth_redirect_uri 覆盖，然后重启服务。",
    );
  const state = createState(sanitizeReturnTo(req.nextUrl.searchParams.get("return_to")));
  const res = new Response(null, {
    status: 302,
    headers: { Location: buildAuthorizeUrl(cfg, state) },
  });
  res.headers.append("Set-Cookie", stateCookie(state));
  return res;
}
