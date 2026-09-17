// Repository helpers — TS implementation (Prisma raw SQL).
import { prisma } from "./prisma";

const nowIso = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86400_000).toISOString().replace(/\.\d+Z$/, "Z");

export async function getCompanion(key: string | null | undefined) {
  if (!key) return null;
  let row = await prisma.companions.findUnique({ where: { id: String(key) } }).catch(() => null);
  if (!row) row = await prisma.companions.findFirst({ where: { slug: String(key) } });
  if (!row)
    row = await prisma.companions
      .findFirst({ where: { OR: [{ id: String(key) }, { slug: String(key) }] } })
      .catch(() => null);
  return (row as Record<string, unknown> | null) ?? null;
}

export async function countMessages(companionId: string, userId: string) {
  const r = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*)::bigint AS n FROM messages WHERE "companionId"=$1 AND "userId"=$2`,
    companionId, userId,
  );
  return Number(r[0]?.n ?? 0);
}

export async function appendMessage(companionId: string, userId: string, role: string, text: string) {
  const mid = `msg-${Date.now()}-${role[0]}`;
  await prisma.messages.create({
    data: { id: mid, companionId, userId, role, content: text, createdAt: nowIso() } as never,
  });
  return mid;
}

export async function listMessages(companionId: string, userId: string, limit = 50) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM messages WHERE "companionId"=$1 AND "userId"=$2 ORDER BY "createdAt" DESC, id DESC LIMIT $3`,
    companionId, userId, limit,
  );
  return rows.reverse();
}
