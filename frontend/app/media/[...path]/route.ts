// /media/* static serving from the local media tree (replaces the Python
// backend's static handler once /sb and /media moved into Next).
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const MEDIA_ROOT = process.env.MEDIA_ROOT || path.join(process.cwd(), "..", "media");
const CTYPE: Record<string, string> = {
  webp: "image/webp", mp4: "video/mp4", mp3: "audio/mpeg", png: "image/png",
  jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: seg } = await ctx.params;
  const p = path.join(MEDIA_ROOT, decodeURIComponent(seg.join("/")));
  if (!p.startsWith(MEDIA_ROOT) || !fs.existsSync(p) || !fs.statSync(p).isFile())
    return Response.json({ error: "not_found" }, { status: 404 });
  const body = fs.readFileSync(p);
  const ext = path.extname(p).slice(1).toLowerCase();
  return new Response(body, {
    headers: {
      "Content-Type": CTYPE[ext] || "application/octet-stream",
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
