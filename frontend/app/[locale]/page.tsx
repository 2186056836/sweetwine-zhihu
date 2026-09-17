import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { verifyJwt } from "@/lib/auth-core";
import { stories as hStories } from "@/lib/api-handlers";
import { AppShell } from "@/components/app-shell";
import { LandingHome } from "@/components/marketing/landing-home";
import { HomeContent } from "@/components/home/home-content";
import { Footer } from "@/components/marketing/footer";
import type { StoryGroup } from "@/components/home/story-ring";


type SessionProfile = {
  id: string;
  email: string;
  nickname: string | null;
  isPremium: boolean;
  tokens: number;
  onboardingComplete: boolean;
} | null;

async function tokenFromStore(store: { get: (k: string) => { value: string } | undefined }) {
  // decoded cookie values may carry UTF-8 (nicknames) and are illegal in raw
  // Headers; sb_mu_session is pure ASCII and sb-auth-auth-token is parsed as JSON
  const mu = store.get("sb_mu_session")?.value;
  if (mu) return mu;
  const raw = store.get("sb-auth-auth-token")?.value;
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { access_token?: string }).access_token ?? null;
  } catch {
    return null;
  }
}

async function readSession(): Promise<SessionProfile> {
  const store = await cookies();
  if (!store.get("sb-auth-auth-token") && !store.get("sb_mu_session")) return null;
  try {
    // verify locally: cookies() returns DECODED values (session JSON carries
    // UTF-8 nicknames) so re-forwarding them as a Cookie header would throw;
    // in-process verification sidesteps the wire-encoding problem entirely
    const { sessionUser } = await import("@/lib/auth-core");
    const { prisma } = await import("@/lib/prisma");
    const tok = await tokenFromStore(store);
    const p = tok ? await verifyJwt(tok) : null;
    if (!p) return null;
    const row = await prisma.users.findUnique({ where: { id: p.sub } });
    if (!row) return null;
    const usage = await prisma.usageTracking.findFirst({ where: { userId: p.sub } });
    return {
      id: p.sub,
      email: String(row.email),
      nickname: (row.nickname as string) ?? null,
      isPremium: false,
      tokens: Math.floor(Number(usage?.monthlyTokensRemaining ?? 0)),
      onboardingComplete: Boolean(row.ageVerified),
    };
  } catch {
    return null;
  }
}


export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ archetype?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { archetype } = await searchParams;
  const profile = await readSession();

  if (!profile) {
    return <LandingHome />;
  }

  const stories = (await hStories().catch(() => ({ groups: [] }))) as { groups: StoryGroup[] };

  return (
    <AppShell
      user={{ nickname: profile.nickname, email: profile.email }}
      isPremium={profile.isPremium}
      tokens={profile.tokens}
    >
      <HomeContent
        isAuthenticated
        isPremium={profile.isPremium}
        storyGroups={stories.groups}
        initialArchetype={archetype || "female"}
      />
      <Footer />
    </AppShell>
  );
}
