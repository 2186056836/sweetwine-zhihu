// Object-storage-compatible public object reads mapped onto the local
// media/ tree (legacy asset owners + companion-portrait fallbacks).
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const MEDIA_ROOT = process.env.MEDIA_ROOT || path.join(process.cwd(), "..", "media");
const CTYPE: Record<string, string> = {
  webp: "image/webp", mp4: "video/mp4", mp3: "audio/mpeg", png: "image/png",
  jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml",
};

function serve(p: string) {
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

function anyImage(root: string): string | null {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop() as string;
    let ents: fs.Dirent[];
    try {
      ents = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (CTYPE[path.extname(e.name).slice(1).toLowerCase()]) return p;
    }
  }
  return null;
}

function fallbackFor(rel: string): string | null {
  const base = path.join(MEDIA_ROOT, "supabase", "companions");
  if (rel.split("/")[0] === "companions") {
    const first = path.join(base, rel.split("/").slice(1)[0]);
    const cands = [first, ...fs.readdirSync(base, { withFileTypes: true })
      .filter((e) => e.isDirectory()).map((e) => path.join(base, e.name))
      .filter((p) => p !== first)];
    for (const c of cands) {
      const hit = anyImage(c);
      if (hit) return hit;
    }
    return null;
  }
  return anyImage(MEDIA_ROOT);
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: seg } = await ctx.params;
  let rel = decodeURIComponent(seg.join("/"));
  rel = rel.includes("object/public/") ? rel.split("object/public/")[1] : rel;
  for (const owner of ["store-a", "store-b"]) {
    const p = path.join(MEDIA_ROOT, owner, rel);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return serve(p);
  }
  const fb = fallbackFor(rel);
  if (fb) return serve(fb);
  return Response.json({ error: "not_found", message: "object not found" }, { status: 404 });
}
