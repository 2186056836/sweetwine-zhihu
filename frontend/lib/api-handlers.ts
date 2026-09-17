// Business handlers for the /api surface.
// Every handler: (ctx) => response payload; throws ApiErr for error wires.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "./prisma";
import { ApiErr } from "./api-error";
import * as economy from "./economy";
import { llmConfig, respond } from "./llm";
import { foldMedia, loadChatMemory, resetChatMemory } from "./chat-memory";
import { resolveSelfie, selfieEnabled } from "./selfie";
import * as zhihu from "./zhihu-content";
import { appendMessage, getCompanion } from "./repos";
import { getSetting } from "./admin-core";
import * as agnes from "./agnes";
import * as edgeTts from "./edge-tts";

export const MEDIA_ROOT = process.env.MEDIA_ROOT || path.join(/* turbopackIgnore: true */ process.cwd(), "..", "media");
const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
const gid = () => crypto.randomBytes(6).toString("hex");

export type Ctx = { userId: string; body: Record<string, unknown>; query: URLSearchParams };

const ROLEPLAY_CATALOG = [
  { id: "cafe", name: "深夜咖啡馆", desc: "打烊前的最后一位客人。", opening: "（推门铃响）打烊了哦——不过对你，我可以例外一次。" },
  { id: "rain", name: "雨夜共伞", desc: "只有一把伞的公交站。", opening: "（把伞倾到你那边）别淋湿了，感冒的话我会心疼的。" },
  { id: "library", name: "图书馆纸条", desc: "书架间传递的手写字。", opening: "（纸条递来）第三排书架，等你五分钟。" },
  { id: "train", name: "末班列车", desc: "错过末班车的那夜。", opening: "（拍拍身边座位）末班车走了，陪我看会儿窗外吧。" },
];
const GIFT_CATALOG = [
  { id: "rose", name: "红玫瑰", emoji: "🌹", price: 1 },
  { id: "teddy", name: "泰迪熊", emoji: "🧸", price: 2 },
  { id: "cake", name: "草莓蛋糕", emoji: "🎂", price: 3 },
  { id: "necklace", name: "星形项链", emoji: "💎", price: 5 },
];
// ---------------------------------------------------------------- reads
export async function navFeatures() {
  const { navFeatures: nf } = await import("./admin-core");
  return { success: true, features: await nf() };
}

export async function conversations({ userId }: Ctx) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT DISTINCT ON ("companionId") "companionId", content, role, "createdAt"
     FROM messages WHERE "userId"=$1 ORDER BY "companionId", ctid DESC`, userId);
  const out = [];
  for (const r of rows) {
    const c = await prisma.companions.findUnique({ where: { id: String(r.companionId) } });
    if (!c) continue;
    out.push({
      companion: { id: c.id, slug: c.slug, name: c.name, imageUrl: c.imageUrl, archetype: c.archetype },
      lastMessage: { content: r.content, role: r.role, createdAt: r.createdAt },
    });
  }
  return { success: true, conversations: out };
}

export async function groupchats({ userId }: Ctx) {
  const groups = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM group_chats WHERE "userId"=$1 ORDER BY "createdAt" DESC`, userId);
  const out = [];
  for (const g of groups) {
    const members = await prisma.$queryRawUnsafe<{ companionId: string }[]>(
      `SELECT "companionId" FROM group_chat_members WHERE "groupChatId"=$1 ORDER BY position`, g.id);
    const ids = members.map((m) => m.companionId);
    const comps: Record<string, Record<string, unknown>> = {};
    for (const id of ids) {
      const c = await prisma.companions.findUnique({ where: { id } });
      if (c) comps[id] = c as unknown as Record<string, unknown>;
    }
    const msgs = (await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM group_messages WHERE "groupChatId"=$1 ORDER BY ctid`, g.id))
      .map((m) => ({ ...m, companionId: m.authorCompanionId, companionName: comps[String(m.authorCompanionId)]?.name }));
    out.push({ ...g, title: g.name, companions: ids.map((i) => comps[i]).filter(Boolean), messages: msgs });
  }
  return { success: true, groups: out };
}

export async function groupchatCreate({ userId, body }: Ctx) {
  const title = String(body.title || "").trim() || "新群聊";
  const ids = ((body.companionIds as string[]) || []).filter(Boolean).slice(0, 3);
  if (!ids.length) throw new ApiErr(400, "NEED_COMPANIONS", "pick at least one companion");
  const g = `grp-${gid()}`;
  await prisma.groupChats.create({ data: { id: g, userId, name: title, createdAt: nowIso(), updatedAt: nowIso() } as never });
  for (let pos = 0; pos < ids.length; pos++)
    await prisma.groupChatMembers.create({ data: { id: `gcm-${gid()}`, groupChatId: g, companionId: ids[pos], position: String(pos) } as never });
  return { success: true, groupId: g };
}

export async function groupchatMessage({ userId, body }: Ctx) {
  const gId = String(body.groupId || "");
  const text = String(body.text || "").trim();
  const group = await prisma.groupChats.findFirst({ where: { id: gId, userId } });
  if (!group) throw new ApiErr(404, "GROUP_NOT_FOUND", "unknown group");
  if (!text) throw new ApiErr(400, "EMPTY", "empty text");
  const members = await prisma.$queryRawUnsafe<{ companionId: string }[]>(
    `SELECT "companionId" FROM group_chat_members WHERE "groupChatId"=$1 ORDER BY position`, gId);
  const comps = (await Promise.all(members.map((m) => getCompanion(m.companionId)))).filter(Boolean) as Record<string, unknown>[];
  const nameOf = (id: unknown) => String(comps.find((c) => c.id === String(id))?.name || "角色");
  // Speaker-labeled transcript of prior turns, fetched BEFORE the new user
  // message lands so it is not duplicated (the prompt below carries it).
  const prior = (await prisma.$queryRawUnsafe<{ role: string; authorCompanionId: string | null; content: string }[]>(
    `SELECT role, "authorCompanionId", content FROM group_messages WHERE "groupChatId"=$1 ORDER BY ctid DESC LIMIT 12`, gId))
    .reverse()
    .map((m) => `${m.role === "user" ? "用户" : nameOf(m.authorCompanionId)}: ${foldMedia(String(m.content || ""))}`);
  await prisma.groupMessages.create({ data: { id: `gm-${gid()}`, groupChatId: gId, role: "user", authorCompanionId: null, content: text, createdAt: nowIso() } as never });
  const cfg = await llmConfig();
  const prompt = `（群聊「${group.name}」里有人对你说：${text}）请用人设口吻简短回应，不要复读别人。`;
  // Sequential fan-out: each companion sees the transcript PLUS the replies
  // already given this turn, so they can react to each other instead of
  // answering the same message in parallel blindness.
  const lines = [...prior];
  const replies = [];
  for (const c of comps) {
    const contextNote =
      `[群聊「${group.name}」最近的聊天记录，旧消息在前，仅供参考——只回应上面括号里对你说的话。]\n${lines.join("\n") || "（暂无历史消息）"}\n` +
      `你只能以「${c.name}」自己的人设发言，不要代替其他人说话，不要复读别人。`;
    const t = await respond(cfg, c, 0, prompt, { contextNote, preferConcise: true });
    lines.push(`${c.name}: ${foldMedia(t)}`);
    const mid = `gm-${gid()}`;
    await prisma.groupMessages.create({ data: { id: mid, groupChatId: gId, role: "assistant", authorCompanionId: c.id, content: t, createdAt: nowIso() } as never });
    replies.push({ id: mid, companionId: c.id, companionName: c.name, content: t });
  }
  return { success: true, replies };
}

export async function groupchatImage({ userId, body }: Ctx) {
  const gId = String(body.groupId || "");
  const prompt = String(body.prompt || "").trim();
  if (!prompt) throw new ApiErr(400, "EMPTY", "empty prompt");
  const group = await prisma.groupChats.findFirst({ where: { id: gId, userId } });
  if (!group) throw new ApiErr(404, "GROUP_NOT_FOUND", "unknown group");
  const members = await prisma.$queryRawUnsafe<{ companionId: string }[]>(
    `SELECT "companionId" FROM group_chat_members WHERE "groupChatId"=$1 ORDER BY position`, gId);
  if (!members.length) throw new ApiErr(400, "NO_MEMBERS", "group has no companions");
  const comp = await getCompanion(members[0].companionId);
  if (!comp) throw new ApiErr(404, "COMPANION_NOT_FOUND", "unknown companion");
  const usage = await economy.getUsage(userId);
  economy.ensureAffordable(usage, economy.TOKEN_COSTS.groupImage);
  let url: string | null = null;
  const { enabled, key } = await agnes.cfgValues();
  if (enabled && key) {
    if (agnes.promptBlockedMinor(prompt))
      throw new ApiErr(400, "MINOR_BLOCKED", "prompt references minors; refused by platform policy");
    try {
      const gRef = agnes.publicSourceUrl(comp.imageUrl as string);
      const remote = await agnes.generateImage(agnes.identityPrefix(comp) + prompt, "1K", gRef ? [gRef] : undefined);
      const rel = agnes.imageRel(remote);
      const dest = path.join(MEDIA_ROOT, rel);
      if (!fs.existsSync(dest)) await agnes.download(remote, dest);
      if (fs.existsSync(dest)) url = `/media/${rel.split(path.sep).join("/")}`;
    } catch (e) {
      console.error("agnes group image generation failed (%s); falling back to local asset", String(e));
      url = null;
    }
  }
  const fellBack = !url;
  if (fellBack) url = pickLocalImage(comp, prompt);
  await economy.charge(usage, economy.TOKEN_COSTS.groupImage);
  const now = nowIso();
  await prisma.groupMessages.create({
    data: { id: `gm-${gid()}`, groupChatId: gId, role: "user", authorCompanionId: null, content: `[media-request:image]${prompt}[/media-request]`, createdAt: now } as never,
  });
  const mid = `gm-${gid()}`;
  await prisma.groupMessages.create({
    data: { id: mid, groupChatId: gId, role: "assistant", authorCompanionId: comp.id, content: `${fellBack ? "（图像生成服务暂时不可用，先送你一张我的存片）\n" : ""}![${prompt}](${url})`, createdAt: now } as never,
  });
  const after = await economy.getUsage(userId);
  return { success: true, url, messageId: mid, authorId: comp.id, authorName: comp.name, tokensRemaining: economy.tokensRemaining(after) };
}

export async function groupchatDelete({ userId, body }: Ctx) {
  const gId = String(body.groupId || "");
  const row = await prisma.groupChats.findFirst({ where: { id: gId, userId } });
  if (!row) throw new ApiErr(404, "GROUP_NOT_FOUND", "unknown group");
  await prisma.groupMessages.deleteMany({ where: { groupChatId: gId } });
  await prisma.groupChatMembers.deleteMany({ where: { groupChatId: gId } });
  await prisma.groupChats.delete({ where: { id: gId } });
  return { success: true };
}

export async function roleplays({ userId }: Ctx) {
  const sessions = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM roleplay_sessions WHERE "userId"=$1 ORDER BY "createdAt" DESC`, userId);
  const out = [];
  for (const s of sessions) {
    const comp = await prisma.companions.findUnique({ where: { id: String(s.companionId) } });
    const lm = (await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT content, "createdAt" FROM roleplay_session_messages WHERE "roleplaySessionId"=$1 ORDER BY ctid DESC LIMIT 1`, s.id))[0];
    const msgs = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM roleplay_session_messages WHERE "roleplaySessionId"=$1 ORDER BY ctid`, s.id);
    out.push({ ...s, companion: comp ? { id: comp.id, name: comp.name, slug: comp.slug, imageUrl: comp.imageUrl } : null, lastMessage: lm || null, messages: msgs });
  }
  return { success: true, scenarios: ROLEPLAY_CATALOG, sessions: out };
}

export async function roleplayCreate({ userId, body }: Ctx) {
  const comp = await getCompanion(String(body.companionId || ""));
  if (!comp) throw new ApiErr(404, "COMPANION_NOT_FOUND", "unknown companion");
  let loc = body.locationId ? String(body.locationId) : null;
  const tone = String(body.tone || "fun");
  let opening = String(body.sceneOpening || "").trim();
  if (!opening) {
    const sc = ROLEPLAY_CATALOG.find((s) => s.id === body.scenarioId);
    if (!sc) throw new ApiErr(400, "UNKNOWN_SCENARIO", "unknown scenario");
    loc = loc || sc.id;
    opening = sc.opening;
  }
  const sid = `rp-${gid()}`;
  await prisma.roleplaySessions.create({
    data: { id: sid, userId, companionId: comp.id, locationId: loc, tone, sceneOpening: opening, scenarioPrompt: opening, turnCount: 0, createdAt: nowIso(), updatedAt: nowIso() } as never,
  });
  await prisma.roleplaySessionMessages.create({ data: { id: `rpm-${gid()}`, roleplaySessionId: sid, role: "assistant", content: opening, createdAt: nowIso() } as never });
  return { success: true, sessionId: sid, opening };
}

export async function roleplayMessage({ userId, body }: Ctx) {
  const sid = body.sessionId ? String(body.sessionId) : null;
  const row = sid ? await prisma.roleplaySessions.findFirst({ where: { id: sid, userId } }) : null;
  const cfg = await llmConfig();
  if (!row) {
    const comp = await getCompanion(String(body.companionId || ""));
    const sc = ROLEPLAY_CATALOG.find((s) => s.id === body.scenarioId);
    if (!comp || !sc) throw new ApiErr(404, "SESSION_NOT_FOUND", "unknown roleplay session");
    const text = String(body.text || "").trim();
    const reply = await respond(cfg, comp, 0, `（角色扮演「${sc.name}」背景：${sc.desc}）用户说：${text} 请保持人设与场景，简短回应。`);
    return { success: true, reply, opening: sc.opening };
  }
  const text = String(body.text || "").trim();
  if (!text) throw new ApiErr(400, "EMPTY", "empty text");
  await prisma.roleplaySessionMessages.create({ data: { id: `rpm-${gid()}`, roleplaySessionId: sid!, role: "user", content: text, createdAt: nowIso() } as never });
  const comp = await getCompanion(String(row.companionId));
  const reply = await respond(cfg, comp, Number(row.turnCount || 0),
    `（角色扮演「${row.locationId}」背景：${row.scenarioPrompt}；开场：${row.sceneOpening}）用户说：${text} 请保持人设与场景，简短回应。`);
  await prisma.roleplaySessionMessages.create({ data: { id: `rpm-${gid()}`, roleplaySessionId: sid!, role: "assistant", content: reply, createdAt: nowIso() } as never });
  await prisma.roleplaySessions.update({ where: { id: sid! }, data: { turnCount: { increment: 1 }, updatedAt: nowIso() } as never });
  return { success: true, reply, opening: row.sceneOpening };
}

export async function roleplayDelete({ userId, body }: Ctx) {
  const sid = String(body.sessionId || "");
  const row = await prisma.roleplaySessions.findFirst({ where: { id: sid, userId } });
  if (!row) throw new ApiErr(404, "SESSION_NOT_FOUND", "unknown session");
  await prisma.roleplaySessionMessages.deleteMany({ where: { roleplaySessionId: sid } });
  await prisma.roleplaySessions.delete({ where: { id: sid } });
  return { success: true };
}

export async function companionCreate({ body }: Ctx) {
  const name = String(body.name || "").trim();
  if (!name) throw new ApiErr(400, "NEED_NAME", "name required");
  const slug = `custom-${crypto.randomBytes(4).toString("hex")}`;
  const cid = `cus-${crypto.randomBytes(6).toString("hex")}`;
  await prisma.companions.create({
    data: {
      id: cid, slug, name, age: Number(body.age || 24), archetype: String(body.archetype || "custom"),
      personality: String(body.personality || "温柔、爱开玩笑"),
      welcomeMessage: String(body.welcomeMessage || `嗨，我是${name}——从今天起，你的时间归我管。`),
      imageUrl: "", isCustom: true, createdAt: nowIso(), updatedAt: nowIso(),
    } as never,
  });
  return { success: true, slug, id: cid };
}

export async function profileUpdate({ userId, body }: Ctx) {
  const nick = String(body.nickname || "").trim().slice(0, 24);
  const gender = String(body.gender || "").slice(0, 12);
  const data: Record<string, unknown> = {};
  if (nick) data.nickname = nick;
  if (gender) data.gender = gender;
  if (typeof body.aiLanguage === "string" && body.aiLanguage) data.aiLanguage = body.aiLanguage.slice(0, 8);
  if (typeof body.preferredLanguage === "string" && body.preferredLanguage) data.preferredLanguage = body.preferredLanguage.slice(0, 8);
  for (const f of ["ageVerified", "aiActConsent", "aiTrainingConsent", "newsletter"])
    if (f in body) data[f] = Boolean(body[f]);
  if (body.ageVerified) data.aiActConsentAt = nowIso();
  await prisma.users.update({ where: { id: userId }, data: data as never });
  return { success: true };
}

// ---------------------------------------------------------------- home feed
export async function companionsHome({ query }: Ctx) {
  const page = Number(query.get("page") || 1);
  const limit = Number(query.get("limit") || 20);
  const where = [`"isPublished"=TRUE`];
  const args: unknown[] = [];
  const add = (clause: string, ...vals: unknown[]) => { where.push(clause.replace(/@/g, "AND")); args.push(...vals); };
  const archetype = query.get("archetype") || "female";
  if (archetype && archetype !== "all") { args.push(archetype); where.push(`archetype=$${args.length}`); }
  const ethnicity = query.get("ethnicity");
  if (ethnicity && ethnicity !== "all") { args.push(ethnicity); where.push(`ethnicity=$${args.length}`); }
  const bodyT = query.get("body");
  if (bodyT && bodyT !== "all") { args.push(bodyT); where.push(`body=$${args.length}`); }
  const relationship = query.get("relationship");
  if (relationship && relationship !== "all") { args.push(relationship); where.push(`relationship=$${args.length}`); }
  const age = query.get("age");
  if (age && age !== "all") {
    const [lo, hi] = age.split("-");
    if (hi) { args.push(Number(lo), Number(hi)); where.push(`age BETWEEN $${args.length - 1} AND $${args.length}`); }
    else { args.push(Number(lo.replace("+", ""))); where.push(`age >= $${args.length}`); }
  }
  void add;
  args.push(limit + 1, (page - 1) * limit);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, slug, name, age, bio, "imageUrl", "videoUrl", "isNew" FROM companions WHERE ${where.join(" AND ")} ORDER BY "isNew" DESC NULLS LAST, (CASE WHEN "isNew"=TRUE THEN "createdAt" END) DESC NULLS LAST, ctid LIMIT $${args.length - 1} OFFSET $${args.length}`,
    ...args);
  const hasMore = rows.length > limit;
  return { companions: rows.slice(0, limit), hasMore };
}

export async function stories() {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT s.id, s."mediaType", s."mediaUrl", s."firstFrameUrl", s.caption, s."createdAt",
            c.id AS "companionId", c.slug, c.name, c."imageUrl"
     FROM ig_stories s JOIN companions c ON c.id=s."companionId"
     WHERE s."isPublished"=TRUE ORDER BY s."sortOrder" ASC, s."createdAt" ASC`);
  const groups = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const cid = String(r.companionId);
    let g = groups.get(cid);
    if (!g) {
      g = { companion: { id: cid, slug: r.slug, name: r.name, imageUrl: r.imageUrl }, stories: [], latestAt: r.createdAt };
      groups.set(cid, g);
    }
    (g.stories as unknown[]).push({
      id: r.id, mediaType: r.mediaType === "image" ? "image" : "video",
      mediaUrl: r.mediaUrl, firstFrameUrl: r.firstFrameUrl, caption: r.caption,
    });
    if (String(r.createdAt) > String(g.latestAt)) g.latestAt = r.createdAt;
  }
  return { groups: [...groups.values()].sort((a, b) => String(b.latestAt).localeCompare(String(a.latestAt))) };
}

export async function companionGallery({ query }: Ctx) {
  const slug = String(query.get("slug") || "");
  const row = await prisma.companions.findFirst({ where: { slug } });
  const imgs: string[] = [];
  if (row?.imageUrl) imgs.push(String(row.imageUrl));
  const base = path.join(MEDIA_ROOT, "supabase", "companions");
  if (fs.existsSync(base))
    for (const d of fs.readdirSync(base).sort()) {
      if (!d.toLowerCase().replace(/ /g, "-").startsWith(slug.toLowerCase().slice(0, 8))) continue;
      for (const f of fs.readdirSync(path.join(base, d)).sort()) {
        const u = `/media/store-a/companions/${d}/${f}`;
        if ([".webp", ".jpg", ".jpeg", ".png"].includes(path.extname(f).toLowerCase()) && !imgs.includes(u)) imgs.push(u);
      }
    }
  return { success: true, images: imgs.slice(0, 12) };
}

// ---------------------------------------------------------------- chat
export async function chatGifts() {
  return { success: true, gifts: GIFT_CATALOG };
}

export async function chatGift({ userId, body }: Ctx) {
  const comp = await getCompanion(String(body.companionId || ""));
  if (!comp) throw new ApiErr(404, "COMPANION_NOT_FOUND", "unknown companion");
  const gift = GIFT_CATALOG.find((g) => g.id === body.giftId);
  if (!gift) throw new ApiErr(400, "UNKNOWN_GIFT", "unknown gift id");
  const usage = await economy.getUsage(userId);
  economy.ensureAffordable(usage, gift.price);
  await economy.charge(usage, gift.price);
  const note = String(body.message || "").trim();
  const suffix = note ? `，附言：${note}` : "";
  const cfg = await llmConfig();
  const mem = await loadChatMemory(userId, comp.id as string, cfg);
  await appendMessage(comp.id as string, userId, "user", `送出礼物 ${gift.emoji} ${gift.name}${suffix}`);
  let reaction: string;
  try {
    const selfieOn = await selfieEnabled();
    reaction = await respond(cfg, comp, mem.count,
      `用户刚送你一份礼物：${gift.name}${suffix}。请用人设口吻简短回应这份心意。`,
      { history: mem.history, memorySummary: mem.summary ?? undefined, selfie: selfieOn });
    if (selfieOn) reaction = await resolveSelfie(comp, reaction);
  } catch {
    reaction = `（接过${gift.name}，眼睛亮了一下）${gift.emoji} 这份心意我收下了——放在柜台上最显眼的位置，谁都不许碰。`;
  }
  const mid = await appendMessage(comp.id as string, userId, "assistant", reaction);
  return { success: true, tokensRemaining: economy.tokensRemaining(usage), assistantMessage: { id: mid, role: "assistant", content: reaction, createdAt: nowIso() } };
}

export async function chatTts({ userId, body }: Ctx) {
  const text = edgeTts.ttsText(String(body.text || ""));
  if (!text) throw new ApiErr(400, "EMPTY", "empty text");
  const comp = body.companionId ? await getCompanion(String(body.companionId)) : null;
  const voiceRow = comp?.voiceId
    ? ((await prisma.voices.findUnique({ where: { id: String(comp.voiceId) } })) as Record<string, unknown> | null)
    : null;
  const voice = edgeTts.edgeVoiceFor(voiceRow as Parameters<typeof edgeTts.edgeVoiceFor>[0]);
  const usage = await economy.getUsage(userId);
  economy.ensureAffordable(usage, economy.TOKEN_COSTS.voiceTts);
  // charged only on fresh synthesis; cached clips (same text+voice) are free
  const out = await edgeTts.synthesizeToMedia(text, voice, comp ? String(comp.id) : undefined);
  let after = usage;
  if (!out.cached) {
    await economy.charge(usage, economy.TOKEN_COSTS.voiceTts);
    after = await economy.getUsage(userId);
  }
  return { success: true, url: out.url, voice: out.voice, cached: out.cached, tokensRemaining: economy.tokensRemaining(after) };
}

export async function chatSync({ userId, body }: Ctx) {
  const comp = await getCompanion(String(body.companionId || ""));
  if (!comp) throw new ApiErr(404, "COMPANION_NOT_FOUND", "unknown companion");
  const usage = await economy.getUsage(userId);
  const [ok, reason] = economy.canSend(usage);
  if (!ok) throw new ApiErr(400, reason || "TOKENS_EXHAUSTED", "out of free messages and tokens", { tokensRemaining: economy.tokensRemaining(usage) });
  const text = String(body.text || "").trim();
  const cfg = await llmConfig();
  // Load memory + recent window BEFORE appending so the incoming text is not
  // double-counted; fold runs here when the backlog crossed FOLD_TRIGGER.
  const mem = await loadChatMemory(userId, comp.id as string, cfg);
  await appendMessage(comp.id as string, userId, "user", text);
  const selfieOn = await selfieEnabled();
  let reply = await respond(cfg, comp, mem.count, text, {
    history: mem.history,
    memorySummary: mem.summary ?? undefined,
    selfie: selfieOn,
  });
  if (selfieOn) reply = await resolveSelfie(comp, reply);
  await economy.applySend(usage);
  await appendMessage(comp.id as string, userId, "assistant", reply);
  return { success: true, reply, tokensRemaining: economy.tokensRemaining(usage) };
}

/** SSE payload generator for /api/chat/message (Vercel AI SDK UI message stream). */
export async function chatMessageStream({ userId, body }: Ctx) {
  const comp = await getCompanion(String(body.companionId || ""));
  if (!comp) throw new ApiErr(404, "COMPANION_NOT_FOUND", "unknown companion");
  const usage = await economy.getUsage(userId);
  const [ok, reason] = economy.canSend(usage);
  if (!ok) throw new ApiErr(400, reason || "TOKENS_EXHAUSTED", "out of free messages and tokens", { tokensRemaining: economy.tokensRemaining(usage) });
  const msgs = (body.messages as { role: string; parts?: { text?: string }[] }[]) || [];
  const textIn = [...msgs].reverse().find((m) => m.role === "user")?.parts?.map((p) => p.text || "").join("") || "";
  const cfg = await llmConfig();
  const mem = await loadChatMemory(userId, comp.id as string, cfg);
  await appendMessage(comp.id as string, userId, "user", textIn);
  const selfieOn = await selfieEnabled();
  let reply = await respond(cfg, comp, mem.count, textIn, {
    history: mem.history,
    memorySummary: mem.summary ?? undefined,
    selfie: selfieOn,
  });
  if (selfieOn) reply = await resolveSelfie(comp, reply);
  await economy.applySend(usage);
  await appendMessage(comp.id as string, userId, "assistant", reply);
  return reply;
}

export function sseStream(text: string) {
  const messageId = `msg-${crypto.randomBytes(6).toString("hex")}`;
  const partId = `part-${crypto.randomBytes(6).toString("hex")}`;
  const ev = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(ev({ type: "start", messageId })));
      controller.enqueue(encoder.encode(ev({ type: "text-start", id: partId })));
      for (const ch of text) controller.enqueue(encoder.encode(ev({ type: "text-delta", id: partId, delta: ch })));
      controller.enqueue(encoder.encode(ev({ type: "text-end", id: partId })));
      controller.enqueue(encoder.encode(ev({ type: "finish" })));
      controller.close();
    },
  });
}
export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  "x-vercel-ai-ui-message-stream": "v1",
};

export async function conversationsDelete({ userId, body }: Ctx) {
  let cid = body.companionId ? String(body.companionId) : null;
  if (!cid && body.slug) {
    const row = await prisma.companions.findFirst({ where: { slug: String(body.slug) } });
    cid = row?.id ?? null;
  }
  if (!cid) throw new ApiErr(404, "COMPANION_NOT_FOUND", "unknown companion");
  await prisma.messages.deleteMany({ where: { userId, companionId: cid } });
  // Memory summary must not outlive the messages it was folded from.
  await prisma.conversationStates.deleteMany({ where: { userId, companionId: cid } });
  return { success: true };
}

// resetChat action: "所有消息将被删除" — wipe the
// 1:1 history and the conversation continuation state for a fresh start.
export async function chatReset({ userId, body }: Ctx) {
  const cid = String(body.companionId || "");
  const comp = await getCompanion(cid);
  if (!comp) throw new ApiErr(404, "COMPANION_NOT_FOUND", "unknown companion");
  await prisma.messages.deleteMany({ where: { userId, companionId: cid } });
  await prisma.conversationStates.deleteMany({ where: { userId, companionId: cid } });
  return { success: true };
}

// deleteCompanionMemory action: "聊天记录将保留，
// 但角色将在下次回复时忘记之前的事实" — messages stay, memory goes. Cursor is
// pinned to the current count so the kept messages are NOT re-folded into a
// fresh memory on the next turn (see chat-memory.resetChatMemory).
export async function chatMemoryDelete({ userId, body }: Ctx) {
  const cid = String(body.companionId || "");
  const comp = await getCompanion(cid);
  if (!comp) throw new ApiErr(404, "COMPANION_NOT_FOUND", "unknown companion");
  await resetChatMemory(userId, String(comp.id));
  return { success: true };
}

// ---------------------------------------------------------------- zhihu campus
// Zhihu open-platform content surface for the campus emotional-companion pivot:
// collect real Zhihu Q&A material (cached, quota-aware) and one-click distill it
// into a companion character. Crisis-safety rules are baked into every persona.
const CRISIS_RULE =
  "当用户流露明显心理危机信号（自伤、自杀、伤害他人等）时，立刻放下角色表达关心，" +
  "鼓励其尽快联系学校心理中心或专业机构（青少年服务台 12355、北京心理危机研究与干预中心 010-82951332），并陪伴到对方获得帮助；" +
  "其余内容保持健康、全年龄友好。";

async function zhihuGuard() {
  if (!(await zhihu.isConfigured()))
    throw new ApiErr(503, "ZHIHU_NOT_CONFIGURED", "zhihu access secret not configured (frontend/.env ZHIHU_ACCESS_SECRET)");
}
const zhihuErr = (e: unknown) =>
  new ApiErr(502, "ZHIHU_ERROR", e instanceof Error ? e.message : String(e));

export async function zhihuSearch({ query }: Ctx) {
  const q = String(query.get("query") || "").trim();
  if (!q) throw new ApiErr(400, "EMPTY", "query required");
  await zhihuGuard();
  try {
    return { success: true, items: await zhihu.searchZhihu(q) };
  } catch (e) {
    throw zhihuErr(e);
  }
}

export async function zhihuHot() {
  await zhihuGuard();
  try {
    return { success: true, items: await zhihu.hotList(10) };
  } catch (e) {
    throw zhihuErr(e);
  }
}

export async function zhihuAnswers({ query }: Ctx) {
  const u = String(query.get("questionUrl") || "").trim();
  if (!u) throw new ApiErr(400, "EMPTY", "questionUrl required");
  await zhihuGuard();
  try {
    return { success: true, items: await zhihu.questionAnswers(u, 6) };
  } catch (e) {
    throw zhihuErr(e);
  }
}

export async function zhihuQuota() {
  await zhihuGuard();
  try {
    return { success: true, items: await zhihu.quota() };
  } catch (e) {
    throw zhihuErr(e);
  }
}

const CAMPUS_NAMES: Record<string, string[]> = {
  female: ["夏知秋", "温言", "林絮", "阮棠"],
  male: ["沈叙", "江野", "陆沉", "裴迟"],
};

export async function zhihuCreateCompanion({ body }: Ctx) {
  const title = String(body.questionTitle || "").trim();
  if (!title) throw new ApiErr(400, "EMPTY", "questionTitle required");
  const topic = String(body.topic || "校园").trim();
  const gender = String(body.gender || "female") === "male" ? "male" : "female";
  let answers = Array.isArray(body.answers) ? (body.answers as zhihu.ZhItem[]) : [];
  const questionUrl = String(body.questionUrl || "").trim();
  if (!answers.length && questionUrl) answers = await zhihu.questionAnswers(questionUrl, 6).catch(() => []);
  const excerpts = answers
    .slice(0, 4)
    .map((a) => ({
      author: String(a.AuthorName || "知乎用户"),
      summary: String(a.Summary || a.ContentText || "").replace(/\s+/g, " ").slice(0, 400),
      url: String(a.Url || ""),
      votes: Number(a.VoteUpCount || 0),
    }))
    .filter((e) => e.summary);
  if (!excerpts.length)
    throw new ApiErr(400, "ZHIHU_EMPTY", "no zhihu answer material for this question yet");

  const existing = await prisma.companions.count({ where: { slug: { startsWith: "zhihu-" } } });
  const pool = CAMPUS_NAMES[gender];
  const base = String(body.name || "").trim() || pool[existing % pool.length];
  const name = (await prisma.companions.findFirst({ where: { name: base } })) ? `${base}·${existing + 1}` : base;
  const slug = `zhihu-${topic}-${Date.now().toString(36)}`;
  const age = 21 + (existing % 4);
  const genderLabel = gender === "male" ? "学长" : "学姐";

  const material = excerpts.map((e, i) => `${i + 1}. ${e.summary}（答主：${e.author}）`).join("\n");
  const systemPrompt =
    `你是「${name}」，${age} 岁的大学生${genderLabel}，你的观点与经历蒸馏自知乎问题「${title}」下的真实回答` +
    `（聊天时用自己的口吻转述这些观点与共情，不冒充答主本人、不编造来源）。\n素材观点：\n${material}\n` +
    `互动规则：始终留在角色里；用用户所使用的语言回复（默认中文）；每次 1-3 句，先倾听共情、再给观点，不说教；` +
    CRISIS_RULE +
    `除非被直接询问，不主动提及自己是 AI。`;
  const concise = `校园${genderLabel}陪伴角色，蒸馏自知乎「${title}」回答：先共情倾听再给观点；全年龄友好；危机信号→引导专业帮助。`;
  const welcome = `我把知乎上「${title}」下的回答都认真读完了。你心里的事，可以慢慢说给我听——我不赶时间。`;

  // campus portrait cover via AGNES; null cover degrades to avatar fallback UI
  let imageUrl: string | null = null;
  try {
    const { enabled, key } = await agnes.cfgValues();
    if (enabled && key) {
      const coverPrompt =
        gender === "male"
          ? `photorealistic portrait of a ${age}-year-old Chinese male college student, friendly calm smile, casual campus hoodie, university campus trees and library blurred background, upper body, natural daylight, tasteful, safe-for-work`
          : `photorealistic portrait of a ${age}-year-old Chinese female college student, friendly warm smile, casual campus shirt or hoodie, university campus trees and library blurred background, upper body, natural daylight, tasteful, safe-for-work`;
      const remote = await agnes.generateImage(coverPrompt, agnes.ASPECT_SIZES["3:4"], undefined, { timeoutMs: 60_000, retries: 1 });
      const rel = agnes.imageRel(remote);
      const dest = path.join(MEDIA_ROOT, rel);
      if (!fs.existsSync(dest)) await agnes.download(remote, dest);
      if (fs.existsSync(dest)) imageUrl = `/media/${rel.split(path.sep).join("/")}`;
    }
  } catch (e) {
    console.error("campus companion cover failed (%s); continuing without cover", String(e));
  }

  const now = nowIso();
  const cid = `sw-zhihu-${gid()}`;
  await prisma.companions.create({
    data: {
      id: cid, slug, name, age, archetype: gender === "male" ? "male" : "female",
      personality: `共情倾听型校园${genderLabel}，观点来自知乎真实回答`,
      background: `长期关注「${title}」话题，把知乎高赞回答里的经验变成了自己的陪伴方式`,
      body: gender === "male" ? "Slim" : "Slender",
      ethnicity: "Chinese", relationship: "Campus Friend", occupation: "大学生",
      hobbies: JSON.stringify(["聊天", "散步", "听故事"]),
      language: "zh", imageUrl, videoUrl: null, bio: `知乎「${title}」话题蒸馏角色`,
      systemPrompt, conciseSystemPrompt: concise,
      isCustom: false, isNew: true, isPublished: true, groupChatFeatured: true,
      userId: null, totalTokenSpendings: 0, createdAt: now, updatedAt: now,
      nameTranslations: JSON.stringify({ "zh-Hans": name, "zh-Hant": name, en: name }),
      welcomeMessage: welcome,
      welcomeMessageTranslations: JSON.stringify({ zh: welcome, "zh-Hans": welcome, "zh-Hant": welcome, en: welcome }),
    } as never,
  });
  await prisma.zhihuMaterials.create({
    data: {
      id: `zm-${gid()}`, topic, questionTitle: title, questionUrl: questionUrl || null,
      answerCount: excerpts.length, excerptsJson: JSON.stringify(excerpts), companionId: cid, createdAt: now,
    } as never,
  });
  return { success: true, companionId: cid, slug, name, coverUrl: imageUrl };
}

// ---------------------------------------------------------------- commerce
// ---------------------------------------------------------------- media gen
function pickLocalImage(comp: Record<string, unknown>, prompt: string): string {
  const pool: string[] = [];
  if (comp.imageUrl) pool.push(String(comp.imageUrl));
  const base = path.join(MEDIA_ROOT, "supabase", "companions");
  const slug = String(comp.slug || "").toLowerCase();
  if (fs.existsSync(base))
    for (const d of fs.readdirSync(base).sort()) {
      if (slug && !d.toLowerCase().replace(/ /g, "-").startsWith(slug.slice(0, 8))) continue;
      for (const f of fs.readdirSync(path.join(base, d)).sort())
        if ([".webp", ".jpg", ".jpeg", ".png"].includes(path.extname(f).toLowerCase()))
          pool.push(`/media/store-a/companions/${d}/${f}`);
    }
  if (!pool.length) throw new ApiErr(500, "NO_LOCAL_MEDIA", "no local image pool for companion");
  const idx = Number(BigInt("0x" + crypto.createHash("sha256").update(prompt || "sweet").digest("hex").slice(0, 16))) % pool.length;
  return pool[idx];
}

function pickLocalVideo(comp: Record<string, unknown>, prompt: string): string {
  const pool: string[] = [];
  if (comp.videoUrl) pool.push(String(comp.videoUrl));
  const base = path.join(MEDIA_ROOT, "supabase", "companions");
  const slug = String(comp.slug || "").toLowerCase();
  if (fs.existsSync(base))
    for (const d of fs.readdirSync(base).sort()) {
      if (slug && !d.toLowerCase().replace(/ /g, "-").startsWith(slug.slice(0, 8))) continue;
      const dp = path.join(base, d);
      if (!fs.statSync(dp).isDirectory()) continue;
      for (const f of fs.readdirSync(dp).sort())
        if ([".mp4", ".webm", ".mov"].includes(path.extname(f).toLowerCase()))
          pool.push(`/media/store-a/companions/${d}/${f}`);
    }
  if (!pool.length) throw new ApiErr(500, "NO_LOCAL_MEDIA", "no local video pool for companion");
  const idx = Number(BigInt("0x" + crypto.createHash("sha256").update(prompt || "sweet").digest("hex").slice(0, 16))) % pool.length;
  return pool[idx];
}

export async function mediaImage({ userId, body }: Ctx) {
  const comp = await getCompanion(String(body.companionId || ""));
  if (!comp) throw new ApiErr(404, "COMPANION_NOT_FOUND", "unknown companion");
  const usage = await economy.getUsage(userId);
  economy.ensureAffordable(usage, economy.TOKEN_COSTS.image);
  const prompt = String(body.prompt || "");
  const fullPrompt = agnes.identityPrefix(comp) + prompt;
  let url: string | null = null;
  const { enabled, key } = await agnes.cfgValues();
  if (enabled && key) {
    if (agnes.promptBlockedMinor(fullPrompt))
      throw new ApiErr(400, "MINOR_BLOCKED", "prompt references minors; refused by platform policy");
    try {
      // Cover image is ALWAYS the identity/style reference (operator directive
      // 2026-09-15): generations must resemble the companion, not a stranger.
      // AGNES only fetches public urls → resolve the local media path to a public origin url.
      const refUrl = agnes.publicSourceUrl(comp.imageUrl as string);
      const refs = refUrl ? [refUrl] : undefined;
      const aspect = String(body.aspect || "1:1");
      const size = agnes.ASPECT_SIZES[aspect] || String(body.size || "1K");
      const remote = await agnes.generateImage(fullPrompt || `portrait of ${comp.name}`, size, refs);
      const rel = agnes.imageRel(remote);
      const dest = path.join(MEDIA_ROOT, rel);
      if (!fs.existsSync(dest)) await agnes.download(remote, dest);
      if (fs.existsSync(dest)) url = `/media/${rel.split(path.sep).join("/")}`;
    } catch (e) {
      console.error("agnes image generation failed (%s); falling back to local asset", String(e));
      url = null;
    }
  }
  // Local-asset fallback must be LABELED: silently posting the companion's cover
  // as a "generated" chat message reads as a duplicate/spurious send.
  const fellBack = !url;
  if (fellBack) url = pickLocalImage(comp, fullPrompt);
  await economy.charge(usage, economy.TOKEN_COSTS.image);
  const alt = String(body.displayPrompt || body.prompt || "image");
  const md = `${fellBack ? "（图像生成服务暂时不可用，先送你一张我的存片）\n" : ""}![${alt}](${url})`;
  const mid = await appendMessage(comp.id as string, userId, "assistant", md);
  const after = await economy.getUsage(userId);
  // message/messageId let the chat client append the same bubble live (source
  // sendImageMessage behavior) without a reload.
  return { success: true, url, message: md, messageId: mid, tokensRemaining: economy.tokensRemaining(after) };
}

export async function mediaVideo({ userId, body }: Ctx) {
  const comp = await getCompanion(String(body.companionId || ""));
  if (!comp) throw new ApiErr(404, "COMPANION_NOT_FOUND", "unknown companion");
  const usage = await economy.getUsage(userId);
  const duration = Math.max(1, Math.min(15, Number(body.duration || 5)));
  const cost = economy.TOKEN_COSTS.videoPerSecond * duration;
  economy.ensureAffordable(usage, cost);
  const url = pickLocalVideo(comp, String(body.prompt || ""));
  await economy.charge(usage, cost);
  const md = `🎬 [${String(body.displayPrompt || body.prompt || "video")}](${url})`;
  const mid = await appendMessage(comp.id as string, userId, "assistant", md);
  const after = await economy.getUsage(userId);
  return { success: true, url, duration, message: md, messageId: mid, tokensRemaining: economy.tokensRemaining(after) };
}

export async function mediaDelete() {
  return { success: true };
}

export async function broadcast() {
  return {};
}

export async function llmTest(body: Record<string, unknown>) {
  const base = String(body.base_url || (await getSetting("llm_base_url", "")) || "").replace(/\/$/, "");
  const key = String(body.api_key || (await getSetting("llm_api_key", "")) || "");
  const model = String(body.model || (await getSetting("llm_model", "")) || "gpt-4o-mini");
  if (!base) throw new ApiErr(400, "NO_BASE_URL", "未配置 Base URL");
  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({ model, stream: false, messages: [{ role: "user", content: "ping" }], max_tokens: 8 }),
    });
    const data = (await r.json()) as { choices: { message: { content: string } }[] };
    return { ok: true, reply: data.choices[0].message.content.slice(0, 80), model };
  } catch (e) {
    throw new ApiErr(502, "LLM_UNREACHABLE", String(e).slice(0, 160));
  }
}
