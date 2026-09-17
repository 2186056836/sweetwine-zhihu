import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";
import { LOCALE_CONFIG } from "@/lib/locale-config";
import { AuthProvider } from "@/components/auth/auth-provider";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "SweetWine",
    template: "%s | SweetWine",
  },
  description: "AI 女友聊天、语音、视频与照片 | 逼真体验",
};

// every locale route renders dynamically (serverUser /
// onboardingComplete come from the session cookie at request time)
export const dynamic = "force-dynamic";


type ServerProfile = {
  id: string;
  email: string;
  nickname: string | null;
  onboardingComplete: boolean;
};

async function readServerProfile(cookie: string | null): Promise<ServerProfile | null> {
  if (!cookie || !cookie.includes("sb-auth-auth-token")) return null;
  try {
    // verify the session locally (shared auth_secret) instead of round-tripping
    // the Python backend, which during the migration may hold a stale secret
    const { verifyJwt } = await import("@/lib/auth-core");
    const { prisma } = await import("@/lib/prisma");
    let tok: string | null = cookie.match(/sb_mu_session=([^;]+)/)?.[1] ?? null;
    if (!tok) {
      const raw = cookie.match(/sb-auth-auth-token=([^;]+)/)?.[1];
      if (raw) { try { tok = (JSON.parse(decodeURIComponent(raw)) as { access_token?: string }).access_token ?? null; } catch { tok = null; } }
    }
    const p = tok ? await verifyJwt(tok) : null;
    if (!p) return null;
    const row = await prisma.users.findUnique({ where: { id: p.sub } });
    if (!row) return null;
    return {
      id: String(row.id),
      email: String(row.email),
      nickname: (row.nickname as string) ?? null,
      onboardingComplete: Boolean(row.ageVerified),
    };
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  // prerender only the primary locales; the remaining 67 render on demand
  // (dynamicParams default true) so builds stay fast with the full locale set
  return ["zh-Hans", "en"].map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  // server-side session read: same contract as the serverUser prop
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const profile = await readServerProfile(cookieHeader || null);

  return (
    <html lang={locale} dir={LOCALE_CONFIG[locale]?.dir === "rtl" ? "rtl" : "ltr"} className="dark">
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider
            serverUser={profile ? { id: profile.id, email: profile.email } : null}
            onboardingComplete={profile ? profile.onboardingComplete : true}
          >
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
        <Toaster position="top-center" theme="dark" richColors />
      </body>
    </html>
  );
}
