// PostgREST-subset GET (/sb/rest/v1/<table>) — same wire semantics as the
// source Supabase: filters, order, limit/offset, Content-Range, single Accept.
import { NextRequest } from "next/server";
import { restGet } from "@/lib/sb-rest";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ table: string }> }) {
  const { table } = await ctx.params;
  const r = await restGet(table, req.nextUrl.searchParams, req.headers);
  return Response.json(r.body, { status: r.status, headers: Object.fromEntries(r.headers) });
}
