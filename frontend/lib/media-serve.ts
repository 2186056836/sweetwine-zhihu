// Local-disk object storage — replaces Supabase Storage; same public-read,
// no-listing semantics (only exact object GETs are served).
import fs from "node:fs";
import path from "node:path";

export const MEDIA_ROOT =
  process.env.MEDIA_ROOT || path.join(/* turbopackIgnore: true */ process.cwd(), "..", "media");

const CTYPE: Record<string, string> = {
  webp: "image/webp", mp4: "video/mp4", mp3: "audio/mpeg", png: "image/png",
  jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml",
};

export function contentType(p: string) {
  return CTYPE[path.extname(p).slice(1).toLowerCase()] || "application/octet-stream";
}

function firstImage(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  for (const f of fs.readdirSync(dir).sort()) {
    if ([".webp", ".jpg", ".jpeg", ".png"].includes(path.extname(f).toLowerCase()))
      return path.join(dir, f);
  }
  return null;
}

// same behaviour as the Python fallback: a missing companion portrait degrades to the
// first available portrait so the UI never renders a broken image
export function fallbackPath(rel: string): string | null {
  const base = path.join(MEDIA_ROOT, "supabase", "companions");
  if (rel.split("/")[0] === "companions") {
    const own = path.join(base, rel.split("/")[1] || "");
    const hit = firstImage(own);
    if (hit) return hit;
  }
  if (!fs.existsSync(base)) return null;
  for (const d of fs.readdirSync(base).sort()) {
    const hit = firstImage(path.join(base, d));
    if (hit) return hit;
  }
  return null;
}

export function serveFile(abs: string): Response {
  const stat = fs.statSync(abs);
  return new Response(fs.readFileSync(abs), {
    headers: {
      "Content-Type": contentType(abs),
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export function notFound() {
  return Response.json({ error: "not_found", message: "object not found" }, { status: 404 });
}
