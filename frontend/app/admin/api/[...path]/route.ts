// /admin/api/* — admin console JSON API.
import { NextRequest } from "next/server";
import { ApiErr } from "@/lib/api-error";
import {
  ADMIN_TABLES, NAV_FEATURE_HREFS, SETTING_KEYS, adminCheckSession, adminDelete,
  adminList, adminLogin, adminRow, adminStats, adminTableNames, adminWrite,
  allSettings, getSetting, issueCode, navFeatures, setSetting,
} from "@/lib/admin-core";
import { llmTest } from "@/lib/api-handlers";
import { getZhihuConfig, zhihuConfigStatus, zhihuOAuthTest } from "@/lib/zhihu-oauth";

export const dynamic = "force-dynamic";

async function dispatch(method: string, sub: string, req: NextRequest, body: Record<string, unknown>, sessionOk: boolean) {
  if (sub === "login" && method === "POST") {
    const cookie = await adminLogin(String(body.password || ""));
    return Response.json({ ok: true }, { headers: { "Set-Cookie": cookie } });
  }
  if (!sessionOk) throw new ApiErr(401, "UNAUTHORIZED", "请先登录");
  if (sub === "logout" && method === "POST")
    return Response.json({ ok: true }, { headers: { "Set-Cookie": "sb_admin=; Path=/; Max-Age=0" } });
  if (sub === "nav-features") {
    if (method === "GET")
      return Response.json({ success: true, features: await navFeatures(), catalog: NAV_FEATURE_HREFS });
    const valid = new Set(NAV_FEATURE_HREFS.map(([h]) => h));
    const disabled = Object.entries(body).filter(([h, v]) => v === false && valid.has(h)).map(([h]) => h);
    await setSetting("nav_features", JSON.stringify(Object.fromEntries(disabled.map((h) => [h, false]))));
    return Response.json({ success: true, features: await navFeatures() });
  }
  if (sub === "stats") return Response.json(await adminStats());
  if (sub === "settings") {
    if (method === "GET") return Response.json(await allSettings());
    for (const [k, v] of Object.entries(body)) if (SETTING_KEYS.has(k)) await setSetting(k, v);
    return Response.json({ ok: true });
  }
  if (sub === "llm/test" && method === "POST") return Response.json(await llmTest(body));
  if (sub === "oauth/zhihu/status" && method === "GET") return Response.json(zhihuConfigStatus(await getZhihuConfig()));
  if (sub === "oauth/zhihu/test" && method === "POST") return Response.json(await zhihuOAuthTest());
  if (sub === "codes/issue" && method === "POST") return Response.json(await issueCode(body));
  if (sub === "tables" && method === "GET") return Response.json({ rows: await adminTableNames() });

  for (const [key, { table, search }] of Object.entries(ADMIN_TABLES)) {
    if (sub === key && method === "GET") {
      const q = req.nextUrl.searchParams.get("q") || "";
      const limit = Number(req.nextUrl.searchParams.get("limit") || 50);
      const offset = Number(req.nextUrl.searchParams.get("offset") || 0);
      const { rows, total } = await adminList(table, q, limit, offset, search);
      return Response.json({ rows, total });
    }
    if (sub.startsWith(key + "/")) {
      const rid = sub.slice(key.length + 1);
      if (method === "GET") {
        const row = await adminRow(table, rid);
        if (!row) throw new ApiErr(404, "NOT_FOUND", "记录不存在");
        return Response.json(row);
      }
      if (method === "PUT") return Response.json(await adminWrite(table, rid, body));
      if (method === "DELETE") { await adminDelete(table, rid); return Response.json({ ok: true }); }
    }
    if (sub === key && method === "POST") return Response.json(await adminWrite(table, null, body, true));
  }
  const m = sub.match(/^table\/([A-Za-z_]+)(?:\/(.+))?$/);
  if (m) {
    const [, tname, rid] = m;
    const valid = new Set(await adminTableNames());
    if (!valid.has(tname)) throw new ApiErr(404, "NOT_FOUND", "未知表");
    if (rid) {
      if (method === "DELETE") { await adminDelete(tname, rid); return Response.json({ ok: true }); }
      const row = await adminRow(tname, rid);
      if (!row) throw new ApiErr(404, "NOT_FOUND", "记录不存在");
      return Response.json(row);
    }
    if (method === "GET") {
      const limit = Number(req.nextUrl.searchParams.get("limit") || 50);
      const offset = Number(req.nextUrl.searchParams.get("offset") || 0);
      const { rows, total } = await adminList(tname, "", limit, offset, []);
      return Response.json({ rows, total });
    }
  }
  throw new ApiErr(404, "NOT_FOUND", "未知管理接口");
}

async function run(method: string, req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: seg } = await ctx.params;
  const sub = seg.join("/");
  const body = method === "GET" ? {} : ((await req.json().catch(() => ({}))) as Record<string, unknown>);
  try {
    const sessionOk = await adminCheckSession(req.headers.get("cookie"));
    return await dispatch(method, sub, req, body, sessionOk);
  } catch (e) {
    if (e instanceof ApiErr)
      return Response.json({ success: false, error: e.code, message: e.message }, { status: e.status });
    console.error("[admin]", sub, e);
    return Response.json({ success: false, error: "internal", message: String(e) }, { status: 500 });
  }
}

export const GET = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => run("GET", req, ctx);
export const POST = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => run("POST", req, ctx);
export const PUT = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => run("PUT", req, ctx);
export const DELETE = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => run("DELETE", req, ctx);
