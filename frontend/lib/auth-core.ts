// GoTrue-compatible auth core — TS implementation.
// PBKDF2-SHA256 password hashes, HMAC-signed JWT-shaped tokens and
// Supabase/GoTrue-shaped session payloads so the frontend's
// supabase-js client works unmodified against these Next route handlers.
import crypto from "node:crypto";
import { prisma } from "./prisma";

const ITERS = 120000;
const ACCESS_TTL = 7 * 86400;
const REFRESH_TTL = 30 * 86400;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const b64u = (obj: unknown) =>
  Buffer.from(JSON.stringify(obj)).toString("base64url");
const ub64 = (s: string) =>
  JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");

async function secret(): Promise<Buffer> {
  let s = await prisma.settings.findUnique({ where: { key: "auth_secret" } });
  if (!s?.value) {
    const v = crypto.randomBytes(32).toString("hex");
    await prisma.settings
      .upsert({
        where: { key: "auth_secret" },
        update: { value: v },
        create: { key: "auth_secret", value: v },
      })
      .catch(async () => {
        await prisma.$executeRaw`INSERT INTO settings (key, value) VALUES ('auth_secret', ${v}) ON CONFLICT (key) DO UPDATE SET value = ${v}`;
      });
    s = { key: "auth_secret", value: v } as never;
  }
  return Buffer.from(s.value as string);
}

export function hashPassword(pw: string, salt?: string, iters = ITERS) {
  const s = salt ?? crypto.randomBytes(16).toString("hex");
  const digest = crypto
    .pbkdf2Sync(pw, Buffer.from(s, "hex"), iters, 32, "sha256")
    .toString("hex");
  return { digest, salt: s, iters };
}

export function verifyPassword(pw: string, row: Record<string, unknown>) {
  const salt = row.salt as string | null;
  const pass = row.pass_hash as string | null;
  if (!salt || !pass) return false;
  const digest = crypto
    .pbkdf2Sync(pw, Buffer.from(salt, "hex"), Number(row.iters || ITERS), 32, "sha256")
    .toString("hex");
  const a = Buffer.from(digest);
  const b = Buffer.from(pass);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

type UserRow = Record<string, unknown>;

export function userObj(row: UserRow) {
  const created = (row.createdAt as string) || (row.created_at as string);
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    gender: row.gender,
    aud: "authenticated",
    role: "authenticated",
    phone: "",
    confirmed_at: created,
    created_at: created,
    user_metadata: { nickname: row.nickname },
    app_metadata: { provider: "email", providers: ["email"] },
    identities: [],
    is_anonymous: false,
  };
}

async function sign(body: string): Promise<string> {
  const sig = crypto
    .createHmac("sha256", await secret())
    .update(body)
    .digest("hex")
    .slice(0, 32);
  return `${body}.${sig}`;
}

export async function makeJwt(row: UserRow, ttl = ACCESS_TTL) {
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({
    sub: row.id,
    role: "authenticated",
    email: row.email,
    aud: "authenticated",
    iss: "http://localhost/sb/auth/v1",
    exp: now + ttl,
    iat: now,
    session_id: "sb-local",
  })}`;
  return sign(body);
}

export async function makeRefresh(row: UserRow) {
  const body = b64u({
    sub: row.id,
    typ: "refresh",
    jti: crypto.randomBytes(8).toString("hex"),
    exp: Math.floor(Date.now() / 1000) + REFRESH_TTL,
  });
  return sign(body);
}

async function verifyTok(tok: string, typ: "access" | "refresh") {
  try {
    const parts = tok.split(".");
    let body: string, pay: string, sig: string;
    if (parts.length === 3) [body, pay, sig] = [`${parts[0]}.${parts[1]}`, parts[1], parts[2]];
    else if (parts.length === 2) [body, pay, sig] = [parts[0], parts[0], parts[1]];
    else return null;
    const want = crypto
      .createHmac("sha256", await secret())
      .update(body)
      .digest("hex")
      .slice(0, 32);
    if (want !== sig) return null;
    const p = ub64(pay);
    if (p.exp < Date.now() / 1000) return null;
    if ((p.typ ?? (typ === "access" ? "access" : typ)) !== typ) return null;
    return p as { sub: string; role?: string; exp: number; typ?: string };
  } catch {
    return null;
  }
}

export const verifyJwt = async (tok: string) => {
  const p = await verifyTok(tok, "access");
  return p && p.role === "authenticated" ? p : null;
};
export const verifyRefresh = (tok: string) => verifyTok(tok, "refresh");

export async function sessionUser(headers: Headers) {
  let tok: string | null = null;
  const auth = headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) tok = auth.slice(7).trim();
  if (!tok) tok = headers.get("cookie")?.match(/sb_mu_session=([A-Za-z0-9._-]+)/)?.[1] ?? null;
  if (!tok) {
    const sbAuth = headers.get("cookie")?.match(/(?:^|; )sb-auth=([^;]+)/)?.[1];
    if (sbAuth) {
      try {
        let r = decodeURIComponent(sbAuth.trim());
        if (r.startsWith("base64-")) r = Buffer.from(r.slice(7), "base64").toString("utf8");
        tok = (JSON.parse(r) as { access_token?: string }).access_token ?? null;
      } catch {
        tok = null;
      }
    }
  }
  if (!tok) {
    const raw = headers.get("cookie")?.match(/sb-auth-auth-token=([^;]+)/)?.[1];
    if (raw) {
      try {
        let r = decodeURIComponent(raw.trim());
        if (r.startsWith("%7B") || r.startsWith("{")) tok = JSON.parse(r).access_token;
        else {
          if (r.startsWith("base64-")) r = r.slice(7);
          tok = ub64(r).access_token;
        }
      } catch {
        tok = null;
      }
    }
  }
  if (!tok) return null;
  return verifyJwt(tok);
}

export async function sessionPayload(row: UserRow) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: await makeJwt(row),
    token_type: "bearer",
    expires_in: ACCESS_TTL,
    expires_at: now + ACCESS_TTL,
    refresh_token: await makeRefresh(row),
    user: userObj(row),
  };
}

export function cookieHeaders(payload: unknown): string[] {
  const v = encodeURIComponent(JSON.stringify(payload));
  return [
    `sb-auth-auth-token=${v}; Path=/; Max-Age=2592000; SameSite=lax`,
    `sb_mu_session=${(payload as { access_token: string }).access_token}; Path=/; Max-Age=2592000; SameSite=lax; HttpOnly`,
  ];
}

const LOGIN_FAILS = new Map<string, [number, number]>();
function throttleCheck(email: string) {
  const rec = LOGIN_FAILS.get(email);
  if (rec && rec[0] >= 5 && Date.now() / 1000 - rec[1] < 300)
    throw new AuthError(429, "too_many_requests", "too many failed attempts; try again in 5 minutes");
}
function throttleNote(email: string, ok: boolean) {
  if (ok) LOGIN_FAILS.delete(email);
  else {
    const [n, t] = LOGIN_FAILS.get(email) ?? [0, 0];
    LOGIN_FAILS.set(email, [n + 1, Date.now() / 1000 || t]);
  }
}

const userById = (id: string) =>
  prisma.users.findUnique({ where: { id } }) as Promise<UserRow | null>;

export async function login(body: Record<string, unknown>) {
  const email = String(body.email || "").trim().toLowerCase();
  const pw = String(body.password || "");
  if (pw.length > 128) throw new AuthError(400, "validation_failed", "password too long");
  throttleCheck(email);
  const row = await prisma.users.findFirst({ where: { email } });
  if (!row || !(row as UserRow).pass_hash) {
    throttleNote(email, false);
    throw new AuthError(400, "invalid_credentials", "invalid login credentials");
  }
  if (!(row as UserRow).password_set)
    throw new AuthError(400, "no_password", "this account has no password yet; sign in with a verification code");
  if (!verifyPassword(pw, row as UserRow)) {
    throttleNote(email, false);
    throw new AuthError(400, "invalid_credentials", "invalid login credentials");
  }
  throttleNote(email, true);
  return sessionPayload(row as UserRow);
}

export async function signup(body: Record<string, unknown>) {
  const email = String(body.email || "").trim().toLowerCase();
  const pw = String(body.password || "");
  if (!EMAIL_RE.test(email)) throw new AuthError(400, "validation_failed", "invalid email address");
  if (pw.length < 8) throw new AuthError(400, "validation_failed", "password must be at least 8 characters");
  if (await prisma.users.findFirst({ where: { email } }))
    throw new AuthError(400, "user_exists", "email already registered");
  const { digest, salt, iters } = hashPassword(pw);
  const uid = crypto.randomUUID();
  const now = nowIso();
  const nick = String(
    (body.data as Record<string, unknown> | undefined)?.nickname ?? body.nickname ?? email.split("@")[0],
  ).slice(0, 24);
  const code = crypto.randomBytes(4).toString("hex").toUpperCase();
  await prisma.users.create({
    data: {
      id: uid, email, nickname: nick, gender: "male", referralCode: code,
      createdAt: now, updatedAt: now, pass_hash: digest, salt, iters, password_set: true,
    } as never,
  });
  return sessionPayload((await userById(uid)) as UserRow);
}

export async function loginOrCreateOtp(email: string) {
  email = (email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new AuthError(400, "validation_failed", "invalid email address");
  const row = await prisma.users.findFirst({ where: { email } });
  if (row) return sessionPayload(row as UserRow);
  const { digest, salt, iters } = hashPassword(crypto.randomBytes(16).toString("hex"));
  const uid = crypto.randomUUID();
  const now = nowIso();
  const code = crypto.randomBytes(4).toString("hex").toUpperCase();
  await prisma.users.create({
    data: {
      id: uid, email, nickname: email.split("@")[0].slice(0, 24), gender: "male",
      referralCode: code, createdAt: now, updatedAt: now,
      pass_hash: digest, salt, iters, password_set: false,
    } as never,
  });
  return sessionPayload((await userById(uid)) as UserRow);
}

export async function changePassword(body: Record<string, unknown>, userId: string) {
  const row = await userById(userId);
  if (!row) throw new AuthError(404, "user_not_found", "user no longer exists");
  const cur = String(body.current || body.currentPassword || "");
  if (row.password_set && !verifyPassword(cur, row))
    throw new AuthError(400, "invalid_credentials", "current password is wrong");
  const next = String(body.password || body.newPassword || "");
  if (next.length < 8 || next.length > 128)
    throw new AuthError(400, "validation_failed", "password must be 8-128 characters");
  const { digest, salt, iters } = hashPassword(next);
  await prisma.users.update({
    where: { id: userId },
    data: { pass_hash: digest, salt, iters, password_set: true } as never,
  });
  return true;
}

export async function recover(headers: Headers) {
  const sess = await sessionUser(headers);
  if (!sess) throw new AuthError(401, "unauthorized", "no recoverable session");
  const row = await userById(sess.sub);
  if (!row) throw new AuthError(401, "unauthorized", "user no longer exists");
  return sessionPayload(row);
}

export async function refresh(body: Record<string, unknown>) {
  const p = await verifyRefresh(String(body.refresh_token || ""));
  if (!p) throw new AuthError(400, "refresh_token_not_found", "invalid refresh token");
  const row = await userById(p.sub);
  if (!row) throw new AuthError(400, "refresh_token_not_found", "user no longer exists");
  return sessionPayload(row);
}
