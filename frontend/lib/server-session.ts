// Server-side session resolution without any network hop: verifies the
// GoTrue-shaped cookie locally (shared auth_secret) so SSR never depends on
// cookie re-encoding (decoded cookie values carry UTF-8 and are illegal in
// raw request headers).
import { cookies } from "next/headers";
import { verifyJwt } from "./auth-core";
import { prisma } from "./prisma";

export type ServerProfile = {
  id: string;
  email: string;
  nickname: string | null;
  onboardingComplete: boolean;
  isPremium: boolean;
  tokens: number;
};

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

export async function serverProfile(): Promise<ServerProfile | null> {
  const store = await cookies();
  try {
    const tok = await tokenFromStore(store);
    const p = tok ? await verifyJwt(tok) : null;
    if (!p) return null;
    const row = await prisma.users.findUnique({ where: { id: p.sub } });
    if (!row) return null;
    const usage = await prisma.usageTracking.findFirst({ where: { userId: p.sub } });
    return {
      id: String(row.id),
      email: String(row.email),
      nickname: (row.nickname as string) ?? null,
      onboardingComplete: Boolean(row.ageVerified),
      isPremium: false,
      tokens: Math.floor(Number(usage?.monthlyTokensRemaining ?? 0)),
    };
  } catch {
    return null;
  }
}

/** Re-encoded Cookie header safe to forward to any HTTP client (UTF-8 proof). */
export async function wireCookieHeader(): Promise<string> {
  const store = await cookies();
  return store.getAll().map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");
}
