// /admin — serves the admin console single-page HTML (lives with the backend
// sources for historical reasons; read from disk per request so edits apply
// without a rebuild).
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const p = path.join(process.cwd(), "..", "backend", "admin_ui.html");
  if (!fs.existsSync(p))
    return new Response("admin ui missing", { status: 404 });
  return new Response(fs.readFileSync(p, "utf8"), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
