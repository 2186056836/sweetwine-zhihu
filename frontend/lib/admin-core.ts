// Admin console core — TS implementation (settings, nav toggles,
// password session, stats, code issue, generic CRUD).
import crypto from "node:crypto";
import { prisma } from "./prisma";
import { ApiErr } from "./api-error";
import { sendEmail } from "./mail";

export const DEFAULT_PASSWORD = "sweetwine-admin";
export const SETTING_KEYS = new Set([
  "llm_base_url", "llm_api_key", "llm_model", "admin_password",
  "agnes_enabled", "agnes_base_url", "agnes_api_key",
  "zhihu_oauth_app_id", "zhihu_oauth_app_key", "zhihu_oauth_redirect_uri",
]);
export const NAV_FEATURE_HREFS: [string, string][] = [
  ["/", "首页"], ["/discover", "发现"],
  ["/chats", "聊天"], ["/groupchat", "AI 群聊"], ["/roleplay", "角色扮演"],
  ["/create", "创建 AI 角色"],
  ["/generate-image", "生成图像"], ["/generate-video", "生成视频"],
  ["/my-ai", "我的 AI"], ["/collection", "收藏"],
];

const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");

export async function getSetting(key: string, def: string | null = null) {
  const row = await prisma.settings.findUnique({ where: { key } }).catch(() => null);
  return row?.value ?? def;
}

export async function setSetting(key: string, value: unknown) {
  const v = typeof value === "string" ? value : JSON.stringify(value);
  await prisma.$executeRawUnsafe(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1,$2,$3)
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=EXCLUDED.updated_at`,
    key, v, nowIso(),
  );
}

export async function allSettings() {
  const rows = await prisma.settings.findMany();
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value as string;
  delete out.admin_session_secret;
  return out;
}

export async function navFeatures() {
  const raw = await getSetting("nav_features");
  let disabled = new Set<string>();
  if (raw) {
    try {
      const data = JSON.parse(raw) as Record<string, unknown>;
      disabled = new Set(Object.entries(data).filter(([, v]) => v === false).map(([h]) => h));
    } catch { /* ignore */ }
  }
  const out: Record<string, boolean> = {};
  for (const [h] of NAV_FEATURE_HREFS) out[h] = !disabled.has(h);
  return out;
}

async function adminToken(password: string) {
  let secret = await getSetting("admin_session_secret");
  if (!secret) {
    secret = crypto.randomBytes(16).toString("hex");
    await setSetting("admin_session_secret", secret);
  }
  return crypto.createHash("sha256").update(password + secret).digest("hex");
}

export async function adminCheckSession(cookieHeader: string | null) {
  const got = cookieHeader?.match(/sb_admin=([^;]+)/)?.[1];
  if (!got) return false;
  const pwd = (await getSetting("admin_password", DEFAULT_PASSWORD)) || DEFAULT_PASSWORD;
  const want = await adminToken(pwd);
  return got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function adminLogin(password: string) {
  const pwd = (await getSetting("admin_password", DEFAULT_PASSWORD)) || DEFAULT_PASSWORD;
  if (password !== pwd) throw new ApiErr(401, "BAD_PASSWORD", "密码错误");
  return `sb_admin=${await adminToken(pwd)}; Path=/; Max-Age=604800; SameSite=lax`;
}

export async function adminStats() {
  const q = async (sql: string) => Number((await prisma.$queryRawUnsafe<{ n: bigint }[]>(sql))[0]?.n ?? 0);
  return {
    companions: await q("SELECT COUNT(*)::bigint n FROM companions"),
    published: await q("SELECT COUNT(*)::bigint n FROM companions WHERE \"isPublished\"=TRUE"),
    users: await q("SELECT COUNT(*)::bigint n FROM users"),
    messages: await q("SELECT COUNT(*)::bigint n FROM messages"),
    email_accounts: await q("SELECT COUNT(*)::bigint n FROM email_accounts"),
    codes_issued: await q("SELECT COUNT(*)::bigint n FROM code_log"),
    messages_today: await q(`SELECT COUNT(*)::bigint n FROM messages WHERE "createdAt" >= '${new Date().toISOString().slice(0, 10)}'`),
    llm_base_url: (await getSetting("llm_base_url", "")) || "(规则池)",
    llm_model: (await getSetting("llm_model", "")) || "",
  };
}

export async function issueCode(body: Record<string, unknown>) {
  const accId = String(body.email_id || "");
  const acc = (await prisma.emailAccounts.findUnique({ where: { id: accId } })) as Record<string, unknown> | null;
  if (!acc) throw new ApiErr(404, "NO_ACCOUNT", "邮箱账号不存在");
  const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  const cid = `code-${crypto.randomBytes(6).toString("hex")}`;
  const target = String(body.target_email || "");
  await prisma.codeLog.create({
    data: { id: cid, email_id: accId, code, target_email: target, purpose: String(acc.purpose || ""), status: "issued", created_at: nowIso() } as never,
  });
  await prisma.emailAccounts.update({ where: { id: accId }, data: { last_used_at: nowIso() } as never });
  const { otpHtml } = await import("./mail");
  const { ok, detail } = await sendEmail(
    target, "SweetWine 验证码 / Verification Code", otpHtml(code, target),
    `Your SweetWine verification code: ${code} (valid 10 minutes)`,
  );
  await prisma.codeLog.update({ where: { id: cid }, data: { status: ok ? "sent" : "failed" } as never });
  return { ok: true, code, id: cid, sent: ok, note: ok ? "SMTP 已发送" : `发送失败: ${detail}` };
}

// ------------------------------------------------------------- generic CRUD
const TABLE_MAP: Record<string, { table: string; search: string[] }> = {
  companions: { table: "companions", search: ["name", "slug"] },
  users: { table: "users", search: ["email", "nickname"] },
  usage: { table: "usage_tracking", search: [] },
  voices: { table: "voices", search: ["name"] },
  emails: { table: "email_accounts", search: ["address"] },
  codes: { table: "code_log", search: ["code", "target_email"] },
  messages: { table: "messages", search: ["content"] },
};
export const ADMIN_TABLES = TABLE_MAP;

export async function adminList(table: string, q: string, limit: number, offset: number, searchCols: string[]) {
  const where = q && searchCols.length
    ? " WHERE " + searchCols.map((c) => `"${c}" ILIKE $1`).join(" OR ")
    : "";
  const args = q && searchCols.length ? [`%${q}%`] : [];
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${table}"${where} ORDER BY ctid DESC LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    ...args, limit, offset,
  );
  const total = Number((await prisma.$queryRawUnsafe<{ c: bigint }[]>(`SELECT COUNT(*)::bigint c FROM "${table}"`))[0]?.c ?? 0);
  return { rows, total };
}

export async function adminRow(table: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "${table}" WHERE id=$1`, id);
  return rows[0] ?? null;
}

export async function adminWrite(table: string, id: string | null, data: Record<string, unknown>, create = false) {
  const cols = (await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_name=$1`, table,
  )).map((c) => c.column_name);
  const fields = Object.fromEntries(Object.entries(data).filter(([k]) => cols.includes(k) && k !== "id"));
  if (create) {
    const newId = id || `${table.slice(0, 4)}-${crypto.randomBytes(6).toString("hex")}`;
    const all: Record<string, unknown> = { ...fields, id: newId };
    const ks = Object.keys(all);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${table}" (${ks.map((k) => `"${k}"`).join(",")}) VALUES (${ks.map((_, i) => `$${i + 1}`).join(",")})`,
      ...ks.map((k) => all[k]),
    );
    return adminRow(table, newId);
  }
  if (!id) throw new ApiErr(400, "NO_ID", "missing id");
  const ks = Object.keys(fields);
  if (!ks.length) throw new ApiErr(400, "NO_FIELDS", "没有可更新字段");
  await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET ${ks.map((k, i) => `"${k}"=$${i + 1}`).join(",")} WHERE id=$${ks.length + 1}`,
    ...ks.map((k) => fields[k]), id,
  );
  return adminRow(table, id);
}

export async function adminDelete(table: string, id: string) {
  await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE id=$1`, id);
}

export async function adminTableNames() {
  const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`,
  );
  return rows.map((r) => r.table_name).filter((n) => !n.startsWith("_")).sort();
}
