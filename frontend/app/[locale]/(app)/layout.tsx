import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";

type SessionProfile = {
  id: string;
  email: string;
  nickname: string | null;
  isPremium: boolean;
  tokens: number;
} | null;

async function readSession(): Promise<SessionProfile> {
  const { serverProfile } = await import("@/lib/server-session");
  return serverProfile();
}

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  return (
    <AppShell
      user={session ? { nickname: session.nickname, email: session.email } : null}
      isPremium={session?.isPremium ?? false}
      tokens={session?.tokens ?? null}
    >
      {children}
    </AppShell>
  );
}
