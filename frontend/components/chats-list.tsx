"use client";

// /chats — ChatsPageContent + row
// components): breadcrumbs, container max-w-4xl, glass-inset pill tabs,
// gradient New Chat link, bordered surface rows with hover-reveal delete.
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ChevronRight, Drama, Home, Loader2, MessageCircle, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteConversation, getConversations, localizedName, type Companion, type Conversation } from "@/lib/api";
import { AvatarImg } from "@/components/avatar-fallback";

type GroupRow = {
  id: string;
  name: string;
  companions: { id: string; name: string; slug: string; imageUrl: string | null }[];
  messages: { content: string }[];
};
type RpRow = {
  id: string;
  locationId?: string | null;
  tone?: string | null;
  sceneOpening?: string | null;
  companion?: { id: string; name: string; slug: string; imageUrl: string | null } | null;
  lastMessage?: { content: string; createdAt: string } | null;
};

const RP_LOCATIONS: Record<string, string> = {
  home: "locations.home", cafe: "locations.cafe", restaurant: "locations.restaurant",
  bar: "locations.bar", library: "locations.library", bookstore: "locations.bookstore",
  park: "locations.park", garden: "locations.garden", nightclub: "locations.nightclub",
  casino: "locations.casino", concert: "locations.concert", theater: "locations.theater",
  cinema: "locations.cinema", carnival: "locations.carnival", stadium: "locations.stadium",
  beach: "locations.beach", pool: "locations.pool", spa: "locations.spa", hotel: "locations.hotel",
  rooftop: "locations.rooftop", yacht: "locations.yacht", cabin: "locations.cabin",
  hotspring: "locations.hotspring", skilodge: "locations.skilodge", campsite: "locations.campsite",
  car: "locations.car", train: "locations.train", airport: "locations.airport",
  cruise: "locations.cruise", museum: "locations.museum", office: "locations.office",
  gym: "locations.gym", university: "locations.university", mall: "locations.mall",
  hospital: "locations.hospital",
};
const RP_TONES: Record<string, string> = {
  fun: "tones.fun.title", romantic: "tones.romantic.title", flirty: "tones.flirty.title",
  mysterious: "tones.mysterious.title", spooky: "tones.spooky.title", action: "tones.action.title",
  dramatic: "tones.dramatic.title", cozy: "tones.cozy.title",
};

function cleanPreview(content?: string | null): string {
  if (!content) return "";
  return content
    .replace(/\[media-request:[^\]]*\][\s\S]*?\[\/media-request\]/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "📷")
    .replace(/\[video:[^\]]*\]\([^)]*\)/g, "🎬")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim();
}

function firstName(name: string): string {
  return name.split(" ")[0] || name;
}

function Breadcrumbs({ label }: { label: string }) {
  return (
    <nav aria-label="Breadcrumb" className="container mx-auto px-4 md:px-6 py-4">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <li>
          <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1" aria-label="Home">
            <Home className="w-4 h-4" />
          </Link>
        </li>
        <li className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span className="text-foreground font-medium" aria-current="page">{label}</span>
        </li>
      </ol>
    </nav>
  );
}

export function ChatsList() {
  const t = useTranslations("chat");
  const tg = useTranslations("groupChat");
  const tr = useTranslations("roleplay");
  const tb = useTranslations("breadcrumbs");
  const router = useRouter();
  const locale = useLocale();
  const sp = useSearchParams();
  const initial = sp.get("tab");
  const [tab, setTab] = useState<"single" | "group" | "roleplay">(
    initial === "group" ? "group" : initial === "roleplay" ? "roleplay" : "single",
  );
  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [groups, setGroups] = useState<GroupRow[] | null>(null);
  const [rps, setRps] = useState<RpRow[] | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (initial === "group") setTab("group");
    else if (initial === "roleplay") setTab("roleplay");
    else if (initial === "single") setTab("single");
  }, [initial]);

  const loadSingle = useCallback(async () => {
    try {
      setConvs(await getConversations());
    } catch {
      setConvs([]);
    }
  }, []);
  const loadGroups = useCallback(async () => {
    try {
      const j = await fetch("/api/groupchats").then((r) => (r.ok ? r.json() : { groups: [] }));
      setGroups(j.groups || []);
    } catch {
      setGroups([]);
    }
  }, []);
  const loadRps = useCallback(async () => {
    try {
      const j = await fetch("/api/roleplays").then((r) => (r.ok ? r.json() : { sessions: [] }));
      setRps(j.sessions || []);
    } catch {
      setRps([]);
    }
  }, []);

  useEffect(() => {
    if (tab === "single" && convs === null) loadSingle();
    if (tab === "group" && groups === null) loadGroups();
    if (tab === "roleplay" && rps === null) loadRps();
  }, [tab, convs, groups, rps, loadSingle, loadGroups, loadRps]);

  async function deleteSingle(companionId: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    setDeleting(companionId);
    try {
      await deleteConversation(companionId);
      toast.success(t("deleteSuccess"));
      setConvs((c) => (c || []).filter((x) => x.companion.id !== companionId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(null);
    }
  }
  async function deleteGroup(id: string) {
    if (!window.confirm(tg("deleteGroup", { default: "删除群聊？" }))) return;
    setDeleting(id);
    try {
      const r = await fetch("/api/groupchats/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: id }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || j.error);
      setGroups((g) => (g || []).filter((x) => x.id !== id));
    } catch {
      toast.error(tg("deleteError", { default: "删除失败" }));
    } finally {
      setDeleting(null);
    }
  }
  async function deleteRp(id: string) {
    if (!window.confirm(tr("deleteRoleplay", { default: "删除角色扮演？" }))) return;
    setDeleting(id);
    try {
      const r = await fetch("/api/roleplay/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || j.error);
      setRps((s) => (s || []).filter((x) => x.id !== id));
    } catch {
      toast.error(tr("deleteError", { default: "删除失败" }));
    } finally {
      setDeleting(null);
    }
  }

  const tabBtn = (active: boolean) =>
    cn(
      "rounded-full px-6 py-2 text-sm font-bold transition-all",
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
    );
  const newChatCls =
    "inline-flex items-center gap-2 px-5 py-2.5 gradient-cta rounded-full font-semibold text-white hover:opacity-90 transition-opacity duration-200";
  const rowCls =
    "group flex items-center gap-4 p-4 rounded-lg border border-border bg-surface-container/50 hover:bg-surface-container transition-colors";
  const delCls =
    "opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-500/10 flex-shrink-0 h-8 w-8";

  return (
    <div className="min-h-screen">
      <div>
        <Breadcrumbs label={tb("chats")} />
        <main className="container mx-auto px-4 md:px-6 py-8 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{t("yourConversations")}</h1>
            <p className="text-muted-foreground text-sm md:text-base">{t("continueChattingDesc")}</p>
          </div>
          <div className="mb-8 inline-flex rounded-full glass-inset p-1">
            <button onClick={() => setTab("single")} className={tabBtn(tab === "single")}>
              {tg("tabSingle", { default: "单聊" })}
            </button>
            <button onClick={() => setTab("group")} className={tabBtn(tab === "group")}>
              {tg("tabGroup", { default: "群聊" })}
            </button>
            <button onClick={() => setTab("roleplay")} className={tabBtn(tab === "roleplay")}>
              {tr("tabRoleplay", { default: "角色扮演" })}
            </button>
          </div>

          {tab === "single" && (
            <div className="space-y-4">
              <Link href="/" className={newChatCls}>
                <Plus className="h-4 w-4" />
                {t("newChat", { default: "新聊天" })}
              </Link>
              {convs === null && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {convs !== null && convs.length === 0 && (
                <div className="text-center py-16">
                  <div className="mb-4 flex justify-center">
                    <div className="p-4 bg-surface-container rounded-full">
                      <MessageCircle className="h-12 w-12 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{t("noConversationsYet")}</h3>
                  <p className="text-muted-foreground mb-6">{t("startChattingDesc")}</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 gradient-cta neon-glow-primary rounded-full font-semibold text-white hover:opacity-90 transition-opacity duration-200">
                      {t("browseCharacters")}
                    </Link>
                    <Link href="/create" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/40 hover:border-primary/70 hover:bg-primary/5 hover:text-foreground text-muted-foreground transition-colors duration-200 font-medium">
                      {t("createCustomCharacter")}
                    </Link>
                  </div>
                </div>
              )}
              {convs !== null &&
                convs.map((c) => (
                  <div key={c.companion.id} className="relative group block p-4 rounded-lg border border-border bg-surface-container/50 hover:bg-surface-container transition-colors">
                    <Link href={`/chat/${c.companion.slug || c.companion.id}`} className="block">
                      <div className="flex items-start gap-4 pr-10">
                        <span className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full">
                          <AvatarImg src={c.companion.imageUrl} name={localizedName(c.companion as unknown as Companion, locale)} className="h-full w-full object-cover" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-base truncate">{localizedName(c.companion as unknown as Companion, locale)}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {cleanPreview(c.lastMessage?.content) || "…"}
                          </p>
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteSingle(c.companion.id);
                      }}
                      disabled={deleting === c.companion.id}
                      className={cn("absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-md", delCls)}
                      aria-label={t("deleteChat")}
                    >
                      {deleting === c.companion.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
            </div>
          )}

          {tab === "group" && (
            <div className="space-y-4">
              <Link href="/groupchat" className={newChatCls}>
                <Plus className="h-4 w-4" />
                {tg("newGroup", { default: "新群聊" })}
              </Link>
              {groups === null && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {groups !== null && groups.length === 0 && (
                <div className="text-center py-16">
                  <div className="mb-4 flex justify-center">
                    <div className="p-4 bg-surface-container rounded-full">
                      <Users className="h-12 w-12 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{tg("emptyTitle", { default: "还没有群聊" })}</h3>
                </div>
              )}
              {groups !== null &&
                groups.map((g) => {
                  const preview = cleanPreview(g.messages[g.messages.length - 1]?.content);
                  const title = g.name || g.companions.map((m) => firstName(localizedName(m as unknown as Companion, locale))).join(", ");
                  return (
                    <div key={g.id} onClick={() => router.push(`/groupchat/${g.id}`)} className={cn(rowCls, "cursor-pointer")}>
                      <span className="relative h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 flex -space-x-3">
                        {g.companions.slice(0, 3).map((m) => (
                          <AvatarImg key={m.id} src={m.imageUrl} name={m.name} className="h-full w-full object-cover" />
                        ))}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate text-base">{title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {preview || tg("noMessagesYet", { default: "暂无消息" })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteGroup(g.id);
                        }}
                        disabled={deleting === g.id}
                        className={cn("flex items-center justify-center rounded-md", delCls)}
                        aria-label={tg("deleteGroup", { default: "删除群聊" })}
                      >
                        {deleting === g.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

          {tab === "roleplay" && (
            <div className="space-y-4">
              <Link href="/roleplay" className={newChatCls}>
                <Plus className="h-4 w-4" />
                {tr("newRoleplay", { default: "新角色扮演" })}
              </Link>
              {rps === null && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {rps !== null && rps.length === 0 && (
                <div className="text-center py-16">
                  <div className="mb-4 flex justify-center">
                    <div className="p-4 bg-surface-container rounded-full">
                      <Drama className="h-12 w-12 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{tr("emptyTitle", { default: "还没有角色扮演" })}</h3>
                </div>
              )}
              {rps !== null &&
                rps.map((s) => {
                  const locKey = s.locationId ? RP_LOCATIONS[s.locationId] : undefined;
                  const toneKey = s.tone ? RP_TONES[s.tone] : undefined;
                  const parts = [
                    (s.companion ? localizedName(s.companion as unknown as Companion, locale) : "角色"),
                    locKey ? tr(locKey) : null,
                    toneKey ? tr(toneKey) : null,
                  ].filter(Boolean);
                  return (
                    <div key={s.id} onClick={() => router.push(`/roleplay/${s.id}`)} className={cn(rowCls, "cursor-pointer")}>
                      <span className="relative h-14 w-14 rounded-xl overflow-hidden flex-shrink-0">
                        <AvatarImg src={s.companion?.imageUrl} name={s.companion?.name} className="h-full w-full object-cover" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate text-base">{parts.join(" · ")}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {cleanPreview(s.lastMessage?.content) || tr("noMessagesYet", { default: "准备好开演" })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRp(s.id);
                        }}
                        disabled={deleting === s.id}
                        className={cn("flex items-center justify-center rounded-md", delCls)}
                        aria-label={tr("deleteRoleplay", { default: "删除角色扮演" })}
                      >
                        {deleting === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
