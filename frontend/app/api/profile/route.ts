// GET /api/profile — same contract as the Python handler; session verified
// locally against the shared auth_secret so Next-issued tokens work here.
import { NextRequest } from "next/server";
import { sessionUser } from "@/lib/auth-core";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = await sessionUser(req.headers);
  if (!p) return Response.json({ success: false, error: "unauthorized" }, { status: 401 });
  const row = await prisma.users.findUnique({ where: { id: p.sub } });
  if (!row) return Response.json({ success: false, error: "unauthorized" }, { status: 401 });
  const usage = await prisma.usageTracking.findFirst({ where: { userId: p.sub } });
  return Response.json({
    success: true,
    id: p.sub,
    email: row.email,
    nickname: row.nickname,
    gender: row.gender,
    isPremium: false,
    onboardingComplete: Boolean(row.ageVerified),
    preferredLanguage: row.preferredLanguage,
    aiLanguage: row.aiLanguage,
    tokens: Math.floor(Number(usage?.monthlyTokensRemaining ?? 0)),
  });
}
