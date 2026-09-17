// SMTP mailer — TS implementation (OTP + simple HTML template).
import nodemailer from "nodemailer";
import { prisma } from "./prisma";

const FALLBACK = {
  host: "smtp.resend.com",
  port: 465,
  user: "resend",
  pass: process.env.SMTP_FALLBACK_PASSWORD || "", // set via .env / server env
  from: "noreply@mail.maoming.me",
};

async function account() {
  const row = await prisma.emailAccounts.findFirst({}).catch(() => null);
  if (row?.smtp_host)
    return {
      host: String(row.smtp_host), port: Number(row.smtp_port || 465),
      user: String(row.username || ""), pass: String(row.password || ""),
      from: String(row.address || FALLBACK.from),
    };
  const g = async (k: string) =>
    (await prisma.settings.findUnique({ where: { key: k } }).catch(() => null))?.value || "";
  const host = await g("smtp_host");
  if (!host) return FALLBACK;
  return {
    host,
    port: Number((await g("smtp_port")) || 465),
    user: await g("smtp_user"),
    pass: await g("smtp_password"),
    from: (await g("smtp_from")) || FALLBACK.from,
  };
}

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const acc = await account();
  try {
    const tx = nodemailer.createTransport({
      host: acc.host, port: acc.port, secure: acc.port === 465,
      auth: { user: acc.user, pass: acc.pass },
    });
    await tx.sendMail({ from: `SweetWine <${acc.from}>`, to, subject, html, text });
    return { ok: true as const, detail: "" };
  } catch (e) {
    return { ok: false as const, detail: e instanceof Error ? e.message : String(e) };
  }
}

export function otpHtml(code: string, email: string) {
  return `<!doctype html><html><body style="margin:0;background:#17101a;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="420" cellpadding="0" cellspacing="0" style="background:#241a26;border-radius:16px;overflow:hidden">
<tr><td style="padding:28px 32px 8px"><span style="color:#ec4899;font-size:22px;font-weight:800">Sweet</span><span style="color:#fff;font-size:22px;font-weight:800">Wine</span></td></tr>
<tr><td style="padding:8px 32px"><p style="color:#e8e0ea;font-size:14px;margin:0 0 16px">您的验证码 / Your verification code for ${email}:</p>
<p style="margin:0 0 16px"><span style="display:inline-block;background:#31223a;color:#fff;font-size:28px;font-weight:800;letter-spacing:6px;padding:12px 22px;border-radius:10px">${code}</span></p>
<p style="color:#9d8fa8;font-size:12px;margin:0">10 分钟内有效 / valid for 10 minutes. 如非本人操作请忽略 / ignore if this was not you.</p></td></tr>
<tr><td style="padding:20px 32px 28px;color:#6d5f78;font-size:11px">© 2026 SweetWine</td></tr>
</table></td></tr></table></body></html>`;
}
