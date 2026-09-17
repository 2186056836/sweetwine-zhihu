// Message/token economy — TS implementation.
// 2026-09-14 全面免费化：所有门控与扣费被掏空为 no-op（canSend 恒放行、
// charge/ensureAffordable 不扣费、applySend 只计数），代币/订阅功能已移除。
// 常量与 usage 行保留以维持既有调用点与统计兼容。
import { prisma } from "./prisma";
import { ApiErr } from "./api-error";

export const FREE_DAILY_MESSAGES = Number(process.env.SB_FREE_DAILY_MESSAGES || 5);
export const START_MONTHLY_TOKENS = Number(process.env.SB_START_MONTHLY_TOKENS || 2);
export const START_PERSISTENT_TOKENS = Number(process.env.SB_START_PERSISTENT_TOKENS || 2);
export const TOKEN_COST_PER_OVERAGE_MESSAGE = 1;

export const TOKEN_COSTS: Record<string, number> = {
  image: 2,
  videoPerSecond: 2,
  groupImage: 2,
  groupChatCreate: 1,
  roleplayCreate: 1,
  voiceTts: 0.2,
};

type Usage = Record<string, unknown>;
const i = (v: unknown) => Math.floor(Number(v || 0));

const nowIso = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86400_000).toISOString().replace(/\.\d+Z$/, "Z");

export async function getUsage(userId: string): Promise<Usage> {
  const row = await prisma.usageTracking.findFirst({ where: { userId } });
  if (row) return row as unknown as Usage;
  await prisma.usageTracking.create({
    data: {
      id: `usage-${userId.slice(0, 8)}`,
      userId,
      // schema quirk: allTimeSpending / monthlyCallMinutesUsed are String? columns —
      // passing numbers makes Prisma reject the create (500 on a fresh user's first message).
      textCount: 0, allTimeSpending: "0", imageCount: 0, videoCount: 0,
      customCompanionsCount: 0, roleplayGenerationsCount: 0, dailyMessageCount: 0,
      dailyResetAt: nowIso(1), monthlyTokensRemaining: START_MONTHLY_TOKENS,
      monthlyTokenResetAt: nowIso(30), monthlyCallMinutesUsed: "0",
      callMinutesResetAt: nowIso(30), persistentTokensRemaining: START_PERSISTENT_TOKENS,
      bonusCallMinutes: 0, updatedAt: nowIso(),
    } as never,
  });
  return (await prisma.usageTracking.findFirst({ where: { userId } })) as unknown as Usage;
}

export function canSend(usage: Usage): [boolean, string | null] {
  void usage;
  return [true, null]; // free mode: never gate
}

export async function applySend(usage: Usage) {
  // free mode: count the message for stats, never drain tokens
  await prisma.usageTracking.update({
    where: { id: String(usage.id) },
    data: { dailyMessageCount: { increment: 1 }, textCount: { increment: 1 } } as never,
  });
}

export function ensureAffordable(usage: Usage, cost: number) {
  void usage;
  void cost; // free mode: everything is affordable
}

export async function charge(usage: Usage, cost: number) {
  void usage;
  void cost; // free mode: never charge
}

export const tokensRemaining = (usage: Usage) => i(usage.monthlyTokensRemaining);
