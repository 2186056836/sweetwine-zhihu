// GoTrue-compatible auth surface (/sb/auth/v1/*) for supabase-js clients.
import { NextRequest } from "next/server";
import {
  AuthError,
  changePassword,
  cookieHeaders,
  login,
  loginOrCreateOtp,
  recover,
  refresh,
  sessionUser,
  signup,
  userObj,
} from "@/lib/auth-core";
import { otpHtml, sendEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CT = { "Content-Type": "application/json" };

function fail(e: unknown) {
  if (e instanceof AuthError)
    return Response.json({ success: false, error: e.code, message: e.message }, { status: e.status });
  console.error("[sb/auth]", e);
  return Response.json({ success: false, error: "internal", message: "internal error" }, { status: 500 });
}

function ok(payload: unknown, cookies = false) {
  const h = new Headers(CT);
  if (cookies) for (const c of cookieHeaders(payload)) h.append("Set-Cookie", c);
  return Response.json(payload, { headers: h });
}

function cleared() {
  const h = new Headers();
  h.append("Set-Cookie", "sb-auth-auth-token=; Path=/; Max-Age=0");
  h.append("Set-Cookie", "sb_mu_session=; Path=/; Max-Age=0; HttpOnly");
  // supabase-js cookieStorage keeps its own chunked session cookie (sb-auth[.N]);
  // without clearing it the client resurrects the session after reload
  h.append("Set-Cookie", "sb-auth=; Path=/; Max-Age=0");
  for (let i = 0; i < 10; i++) h.append("Set-Cookie", `sb-auth.${i}=; Path=/; Max-Age=0`);
  return new Response(null, { status: 204, headers: h });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const sub = path.join("/");
  try {
    if (sub === "settings")
      return Response.json(
        {
          external: {
            email: true, google: false, discord: false, twitter: false, apple: false,
            github: false, kakao: false, spotify: false, slack: false, bitbucket: false,
            gitlab: false, facebook: false, notion: false, twitch: false, workos: false,
            linkedin: false, figma: false, zoom: false, keycloak: false, azure: false,
          },
          disable_signup: false,
          mailer_autoconfirm: true,
          passkeys_enabled: false,
          mfa_enabled: false,
        },
        { headers: CT },
      );
    if (sub === "user") {
      const p = await sessionUser(req.headers);
      if (!p)
        return Response.json({ error: "unauthorized", message: "invalid or missing token" }, { status: 401 });
      const row = await prisma.users.findUnique({ where: { id: p.sub } });
      if (!row)
        return Response.json({ error: "unauthorized", message: "user no longer exists" }, { status: 401 });
      return Response.json(userObj(row as Record<string, unknown>), { headers: CT });
    }
    return Response.json({ error: "not_found" }, { status: 404 });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const sub = path.join("/");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    if (sub === "token") {
      const grant = req.nextUrl.searchParams.get("grant_type") || "password";
      if (grant === "password") return ok(await login(body), true);
      if (grant === "refresh_token") return ok(await refresh(body), true);
      throw new AuthError(400, "unsupported_grant_type", "only email+password login is enabled");
    }
    if (sub === "signup") return ok(await signup(body), true);
    if (sub === "otp") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) throw new AuthError(400, "invalid_email", "email required");
      const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
      const now = Math.floor(Date.now() / 1000);
      await prisma.authOtps.upsert({
        where: { email },
        update: { code, attempts: 0, created_at: String(now), expires_at: String(now + 600) },
        create: { email, code, attempts: 0, created_at: String(now), expires_at: String(now + 600) },
      });
      const sent = await sendEmail(
        email,
        "SweetWine 验证码 / Verification Code",
        otpHtml(code, email),
        `Your SweetWine verification code: ${code} (valid 10 minutes)`,
      );
      if (!sent.ok) throw new AuthError(502, "mail_failed", `SMTP send failed: ${sent.detail}`);
      return Response.json({}, { headers: CT });
    }
    if (sub === "verify") {
      const email = String(body.email || "").trim().toLowerCase();
      const token = String(body.token || "").trim();
      const row = await prisma.authOtps.findUnique({ where: { email } });
      if (!row || Number(row.expires_at) < Date.now() / 1000)
        throw new AuthError(400, "otp_expired", "code expired, request a new one");
      if (Number(row.attempts) >= 5)
        throw new AuthError(429, "too_many_attempts", "too many attempts, request a new code");
      if (row.code !== token) {
        await prisma.authOtps.update({ where: { email }, data: { attempts: Number(row.attempts) + 1 } });
        throw new AuthError(400, "otp_invalid", "invalid code");
      }
      await prisma.authOtps.delete({ where: { email } });
      return ok(await loginOrCreateOtp(email), true);
    }
    if (sub === "recover") return ok(await recover(req.headers), true);
    if (sub === "logout") return cleared();
    if (sub === "magiclink") throw new AuthError(400, "unsupported", "magiclink is not enabled");
    return Response.json({ error: "not_found" }, { status: 404 });
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (path.join("/") !== "user") return Response.json({ error: "not_found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const p = await sessionUser(req.headers);
    if (!p) return Response.json({ error: "unauthorized", message: "invalid or missing token" }, { status: 401 });
    await changePassword(body, p.sub);
    return Response.json({}, { headers: CT });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE() {
  return cleared();
}
