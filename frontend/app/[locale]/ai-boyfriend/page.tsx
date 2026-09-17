import { setRequestLocale } from "next-intl/server";
import { SeoAiBoyfriendPage } from "@/components/marketing/seo/ai-boyfriend";
import { SeoAiBoyfriendPageEn } from "@/components/marketing/seo/en/ai-boyfriend";

import { cookies } from "next/headers";
import { CRUMB_KEYS, crumbLabelFor } from "@/lib/crumb-keys";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";

async function readSession() {
  const { serverProfile } = await import("@/lib/server-session");
  return serverProfile();
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await readSession();
  const t = await getTranslations({ locale, namespace: CRUMB_KEYS['ai-boyfriend'] ?? "breadcrumbs" });
  const crumbLabel = crumbLabelFor(t, CRUMB_KEYS['ai-boyfriend'] ?? "breadcrumbs", "AI 男友");
  const authenticated = !!session;
  const body = locale.startsWith("en") ? <SeoAiBoyfriendPageEn authenticated={authenticated} /> : <SeoAiBoyfriendPage authenticated={authenticated} />;
  if (!session) return body;
  return (
    <AppShell
      user={{ nickname: session.nickname, email: session.email }}
      isPremium={session.isPremium}
      tokens={session.tokens}
    >
      <Breadcrumbs label={crumbLabel} />
      <div className="pb-8">{body}</div>
    </AppShell>
  );
}
