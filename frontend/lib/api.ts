// Typed helpers for the local backend's function surface (/api/*).
// Shapes match the /api route handlers.

export type Companion = {
  id: string;
  slug: string;
  name: string;
  age?: number | null;
  archetype?: string | null;
  personality?: string | null;
  background?: string | null;
  body?: string | null;
  ethnicity?: string | null;
  relationship?: string | null;
  occupation?: string | null;
  hobbies?: string | null; // JSON array string
  language?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  bio?: string | null;
  welcomeMessage?: string | null;
  welcomeMessageTranslations?: string | Record<string, string> | null;
  isCustom?: number | boolean | null;
  isNew?: number | boolean | null;
  userId?: string | null;
  nameTranslations?: string | Record<string, string> | null;
};

// welcome messages are localized per locale
export function localizedWelcomeMessage(c: Pick<Companion, "welcomeMessage" | "welcomeMessageTranslations">, locale: string): string | null {
  const t = c.welcomeMessageTranslations;
  if (t) {
    const map = typeof t === "string" ? (() => { try { return JSON.parse(t); } catch { return null; } })() : t;
    const v = map && (map[locale] || map[locale === "zh-Hans" ? "zh" : locale]);
    if (typeof v === "string" && v) return v;
  }
  return c.welcomeMessage || null;
}

// companion names are localized per locale, applied client-side
export function localizedName(c: Pick<Companion, "name" | "nameTranslations">, locale: string): string {
  const t = c.nameTranslations;
  if (t) {
    const map = typeof t === "string" ? (() => { try { return JSON.parse(t); } catch { return null; } })() : t;
    const v = map && (map[locale] || map[locale === "zh-Hans" ? "zh" : locale]);
    if (typeof v === "string" && v) return v;
  }
  return c.name;
}

export type Conversation = {
  companion: Pick<Companion, "id" | "slug" | "name" | "imageUrl" | "archetype">;
  lastMessage: { content: string; role: string; createdAt: string } | null;
};

export type Profile = {
  success: boolean;
  id?: string;
  email: string;
  nickname: string | null;
  gender: string | null;
  isPremium: boolean;
  onboardingComplete?: boolean;
  preferredLanguage?: string | null;
  aiLanguage?: string | null;
  tokens: number;
};

export type DbMessage = {
  id: string;
  userId: string;
  companionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.message || j.error || msg;
    } catch {
      /* keep statusText */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export async function getConversations(): Promise<Conversation[]> {
  const j = await handle<{ success: boolean; conversations: Conversation[] }>(
    await fetch("/api/conversations", { cache: "no-store" }),
  );
  return j.conversations || [];
}

export async function getProfile(): Promise<Profile | null> {
  try {
    return await handle<Profile>(
      await fetch("/api/profile", { cache: "no-store" }),
    );
  } catch {
    return null;
  }
}

export async function deleteConversation(companionId: string) {
  return handle<{ success: boolean }>(
    await fetch("/api/conversations/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companionId }),
    }),
  );
}

export async function getCompanionBySlug(slug: string): Promise<Companion | null> {
  const res = await fetch(
    "/sb/rest/v1/companions?select=*&slug=eq." + encodeURIComponent(slug) + "&limit=1",
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as Companion[];
  return rows[0] || null;
}

export async function listCompanions(limit = 48): Promise<Companion[]> {
  const res = await fetch(
    "/sb/rest/v1/companions?select=id,slug,name,age,archetype,imageUrl,isNew,videoUrl,bio,isCustom,userId,nameTranslations&order=createdAt.desc&limit=" +
      limit,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  return (await res.json()) as Companion[];
}

export async function getHistory(
  userId: string,
  companionId: string,
): Promise<DbMessage[]> {
  const res = await fetch(
    "/sb/rest/v1/messages?select=*&userId=eq." +
      encodeURIComponent(userId) +
      "&companionId=eq." +
      encodeURIComponent(companionId) +
      "&order=createdAt.asc&limit=100",
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  return (await res.json()) as DbMessage[];
}

export async function getGallery(slug: string): Promise<string[]> {
  try {
    const j = await handle<{ success: boolean; images: string[] }>(
      await fetch("/api/companion/gallery?slug=" + encodeURIComponent(slug), {
        cache: "no-store",
      }),
    );
    return j.images || [];
  } catch {
    return [];
  }
}

export type Gift = { id: string; name: string; emoji: string; price: number };

export async function getGifts(): Promise<Gift[]> {
  try {
    const j = await handle<{ success: boolean; gifts: Gift[] }>(
      await fetch("/api/chat/gifts", { cache: "no-store" }),
    );
    return j.gifts || [];
  } catch {
    return [];
  }
}

// cookie-authed history fetch (same-origin credentials; backend RLS scopes by session)
export async function getHistoryByCompanion(companionId: string): Promise<DbMessage[]> {
  const res = await fetch(
    `/sb/rest/v1/messages?companionId=eq.${encodeURIComponent(companionId)}&order=createdAt.asc&limit=500`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  return (await res.json()) as DbMessage[];
}
