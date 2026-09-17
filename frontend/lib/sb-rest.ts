// PostgREST-subset GET for supabase-js clients.
// Same wire semantics the supabase-js client expects: select filters,
// order/limit/offset, Content-Range, boolean wire types and the
// application/vnd.pgrst.object+json single-object Accept.
import { prisma } from "./prisma";

const SKIP = new Set(["select", "order", "limit", "offset", "or", "and"]);

type Row = Record<string, unknown>;

function filterRows(rows: Row[], params: URLSearchParams): Row[] {
  let out = rows;
  for (const [key, val] of params) {
    if (SKIP.has(key)) continue;
    for (const v of [val]) {
      if (v === "is.null") out = out.filter((r) => r[key] === null || r[key] === undefined);
      else if (v.startsWith("eq.")) out = out.filter((r) => String(r[key]) === v.slice(3));
      else if (v.startsWith("neq.")) out = out.filter((r) => String(r[key]) !== v.slice(4));
      else if (v.startsWith("ilike.")) {
        const pat = v.slice(6).replace(/%/g, "").toLowerCase();
        out = out.filter((r) => String(r[key] ?? "").toLowerCase().includes(pat));
      } else if (v.startsWith("gte."))
        out = out.filter((r) => Number(r[key] || 0) >= Number(v.slice(4)));
      else if (v.startsWith("lte."))
        out = out.filter((r) => Number(r[key] || 0) <= Number(v.slice(4)));
    }
  }
  return out;
}

let tableCache: Set<string> | null = null;
async function tables(): Promise<Set<string>> {
  if (tableCache) return tableCache;
  const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`,
  );
  tableCache = new Set(rows.map((r) => r.table_name).filter((t) => !t.startsWith("_")));
  return tableCache;
}

export async function restGet(table: string, params: URLSearchParams, headers: Headers) {
  const json = [["Content-Type", "application/json"]] as [string, string][];
  if (!(await tables()).has(table))
    return { status: 404, headers: json, body: { code: "42P01", message: `no such table: ${table}` } };
  let rows = (await prisma.$queryRawUnsafe<Row[]>(`SELECT * FROM "${table}"`)) as Row[];
  rows = filterRows(rows, params);
  const order = params.get("order");
  if (order && rows.length) {
    // PostgREST order wire = "col.direction[.nulls]"; the old 3-slot destructure
    // left direction undefined and silently sorted everything ascending.
    const [col, direction] = order.split(".");
    if (col in rows[0])
      rows.sort((a, b) => {
        const av = a[col] as never, bv = b[col] as never;
        const c = av === bv ? 0 : av > bv ? 1 : av < bv ? -1 : 0;
        return direction === "desc" ? -c : c;
      });
  }
  const total = rows.length;
  const limit = Number(params.get("limit") ?? Number.MAX_SAFE_INTEGER);
  const offset = Number(params.get("offset") ?? 0);
  rows = rows.slice(offset, offset + limit);
  const select = params.get("select");
  if (select && select !== "*") {
    const cols = select.split(",").map((c) => c.trim()).filter((c) => c && !c.includes("->"));
    rows = rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
  }
  const accept = headers.get("accept") || "";
  if (accept.includes("vnd.pgrst.object+json")) {
    if (!rows.length)
      return {
        status: 406, headers: json,
        body: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" },
      };
    return { status: 200, headers: json, body: rows[0] };
  }
  const rng = rows.length ? `${offset}-${offset + rows.length - 1}/${total}` : `*/${total}`;
  return {
    status: 200,
    headers: [...json, ["Content-Range", rng]] as [string, string][],
    body: rows,
  };
}
