// /api/* business surface — single catch-all dispatcher.
// Session-gated like the Python gate; /api/nav-features GET stays public.
import { NextRequest } from "next/server";
import { AuthError, changePassword, sessionUser } from "@/lib/auth-core";
import { ApiErr } from "@/lib/api-error";
import * as H from "@/lib/api-handlers";

export const dynamic = "force-dynamic";

type Resp = { status?: number; headers?: Record<string, string>; body: unknown };
const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Resp => ({ status, headers, body });

async function dispatch(method: string, path: string, req: NextRequest, userId: string | null) {
  const body = method === "GET" ? {} : ((await req.json().catch(() => ({}))) as Record<string, unknown>);
  const query = req.nextUrl.searchParams;
  const ctx = { userId: userId || "", body, query };
  if (!userId && !(path === "/api/nav-features" && method === "GET"))
    throw new ApiErr(401, "unauthorized", "login required");

  switch (method) {
    case "GET":
      switch (path) {
        case "/api/nav-features": return json(await H.navFeatures());
        case "/api/conversations": return json(await H.conversations(ctx));
        case "/api/groupchats": return json(await H.groupchats(ctx));
        case "/api/roleplays": return json(await H.roleplays(ctx));
        case "/api/stories": return json(await H.stories());
        case "/api/companions/home": return json(await H.companionsHome(ctx));
        case "/api/companion/gallery": return json(await H.companionGallery(ctx));
        case "/api/chat/gifts": return json(await H.chatGifts());
        case "/api/zhihu/search": return json(await H.zhihuSearch(ctx));
        case "/api/zhihu/hot": return json(await H.zhihuHot());
        case "/api/zhihu/answers": return json(await H.zhihuAnswers(ctx));
        case "/api/zhihu/quota": return json(await H.zhihuQuota());
      }
      break;
    case "POST":
      switch (path) {
        case "/api/chat/message": {
          const reply = await H.chatMessageStream(ctx);
          return { status: 200, headers: H.SSE_HEADERS, body: H.sseStream(reply), raw: true };
        }
        case "/api/chat/sync": return json(await H.chatSync(ctx));
        case "/api/chat/reset": return json(await H.chatReset(ctx));
        case "/api/chat/memory/delete": return json(await H.chatMemoryDelete(ctx));
        case "/api/chat/tts": return json(await H.chatTts(ctx));
        case "/api/chat/gift": return json(await H.chatGift(ctx));
        case "/api/media/image": return json(await H.mediaImage(ctx));
        case "/api/media/video": return json(await H.mediaVideo(ctx));
        case "/api/media/delete": return json(await H.mediaDelete());
        case "/api/conversations/delete": return json(await H.conversationsDelete(ctx));
        case "/api/groupchats/create": return json(await H.groupchatCreate(ctx));
        case "/api/groupchats/message": return json(await H.groupchatMessage(ctx));
        case "/api/groupchats/delete": return json(await H.groupchatDelete(ctx));
        case "/api/groupchats/image": return json(await H.groupchatImage(ctx));
        case "/api/roleplay/create": return json(await H.roleplayCreate(ctx));
        case "/api/roleplay/message": return json(await H.roleplayMessage(ctx));
        case "/api/roleplay/delete": return json(await H.roleplayDelete(ctx));
        case "/api/profile/update": return json(await H.profileUpdate(ctx));
        case "/api/auth/password": {
          // same
          // core as PUT /sb/auth/v1/user. SetPasswordStep (post-OTP signup) and
          // settings-page both call this. AuthError -> ApiErr keeps 400 semantics.
          try {
            await changePassword(body, ctx.userId);
          } catch (e) {
            if (e instanceof AuthError) throw new ApiErr(e.status, e.code, e.message);
            throw e;
          }
          return json({ success: true });
        }
        case "/api/companions/create": return json(await H.companionCreate(ctx));
        case "/api/zhihu/create-companion": return json(await H.zhihuCreateCompanion(ctx));
        case "/api/broadcast": return json(await H.broadcast());
      }
      break;
  }
  throw new ApiErr(404, "NOT_FOUND", `unknown api route ${method} ${path}`);
}

async function run(method: string, req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: seg } = await ctx.params;
  const path = `/api/${seg.join("/")}`;
  try {
    const sess = await sessionUser(req.headers);
    const r = (await dispatch(method, path, req, sess?.sub ?? null)) as Resp & { raw?: boolean };
    if (r.raw) return new Response(r.body as ReadableStream, { status: r.status, headers: r.headers });
    return Response.json(r.body, { status: r.status ?? 200, headers: r.headers });
  } catch (e) {
    if (e instanceof ApiErr)
      return Response.json({ success: false, error: e.code, message: e.message, ...e.extra }, { status: e.status });
    console.error("[api]", path, e);
    return Response.json({ success: false, error: "internal", message: String(e) }, { status: 500 });
  }
}

export const GET = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => run("GET", req, ctx);
export const POST = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => run("POST", req, ctx);
