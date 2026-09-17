"use client";

// /groupchat — lobby
// (GroupChatLobby + picker + Breadcrumbs 849621 + useInfiniteScroll 646045).
// Contracts:
//   GET  /sb/rest/v1/companions   -> picker options (premade + own customs)
//   POST /api/groupchats/create   -> {groupId}          {companionIds[2..3]}
//   GET  /api/groupchats          -> {groups:[...]}     (history lives on /chats?tab=group)
//   POST /api/groupchats/message  -> {replies:[...]}
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname, Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight, Film, Gift, History, Home, ImageIcon, Loader2, Volume2 } from "lucide-react";
import { CoinIcon } from "@/components/coin-icon";
import { listCompanions, localizedName, type Companion } from "@/lib/api";
import { CharacterCard } from "@/components/home/character-card";
import { Button } from "@/components/ui/button";
import { AvatarImg } from "@/components/avatar-fallback";
import { cn } from "@/lib/utils";

type GroupMember = { id: string; name: string; slug: string; imageUrl: string | null };
type GroupMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  companionId?: string | null;
  companionName?: string | null;
  createdAt: string;
};
type Group = {
  id: string;
  name: string;
  createdAt: string;
  companions: GroupMember[];
  messages: GroupMessage[];
};

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const j = await r.json();
  if (!r.ok || j.success === false) throw new Error(j.message || j.error || r.statusText);
  return j as T;
}

/* Breadcrumbs */
function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="container mx-auto px-4 md:px-6 py-4">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <li>
          <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1" aria-label="Home">
            <Home className="w-4 h-4" />
          </Link>
        </li>
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {it.href ? (
              <Link href={it.href} className="hover:text-primary transition-colors">
                {it.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium" aria-current="page">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* useInfiniteScroll */
function useInfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  rootMargin = "150px",
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const cb = useRef(onLoadMore);
  cb.current = onLoadMore;
  useEffect(() => {
    if (!hasMore || loading) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((e) => {
      if (e[0]?.isIntersecting) cb.current();
    }, { rootMargin });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, rootMargin]);
  return ref;
}

function PickerTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
        active
          ? "border-primary text-primary bg-primary/10"
          : "border-transparent glass-flat text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

type PickerOptions = { premade: Companion[]; custom: Companion[] };

function CompanionPicker({
  options,
  selectedIds,
  maxMembers,
  onToggle,
}: {
  options: PickerOptions;
  selectedIds: string[];
  maxMembers: number;
  onToggle: (c: Companion) => void;
}) {
  const t = useTranslations("groupChat");
  const [tab, setTab] = useState("female");
  const [limit, setLimit] = useState(20);
  const full = selectedIds.length >= maxMembers;
  const tabs = useMemo(
    () => [
      { key: "female", label: t("sectionWoman", { default: "Women" }) },
      { key: "anime", label: t("sectionAnime", { default: "Anime" }) },
      { key: "male", label: t("sectionMan", { default: "Men" }) },
      { key: "custom", label: t("tabMyAi", { default: "My AI" }) },
    ],
    [t],
  );
  const list = useMemo(
    () => (tab === "custom" ? options.custom : options.premade.filter((c) => c.archetype === tab)),
    [tab, options],
  );
  useEffect(() => {
    setLimit(20);
  }, [tab]);
  const visible = list.slice(0, limit);
  const hasMore = limit < list.length;
  const sentinel = useInfiniteScroll({ hasMore, loading: false, onLoadMore: () => setLimit((n) => n + 20) });

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map((x) => (
          <PickerTab key={x.key} active={tab === x.key} onClick={() => setTab(x.key)}>
            {x.label}
          </PickerTab>
        ))}
      </div>
      {tab === "custom" && options.custom.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-16">
          {t("noCustom", { default: "You haven't created any AI characters yet." })}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {visible.map((c, i) => {
              const sel = selectedIds.includes(c.id);
              return (
                <div
                  key={c.id}
                  className={cn("relative transition-all", !sel && full && "opacity-50 pointer-events-none")}
                >
                  <CharacterCard
                    companion={c as never}
                    onClick={() => onToggle(c)}
                    shouldPreload={i < 8}
                    priority={i < 4}
                    hideMeta
                    selected={sel}
                  />
                </div>
              );
            })}
          </div>
          {hasMore && <div ref={sentinel} className="h-10" aria-hidden />}
        </>
      )}
    </div>
  );
}

export function GroupChatPage() {
  const t = useTranslations("groupChat");
  const tb = useTranslations("breadcrumbs");
  const router = useRouter();
  const locale = useLocale();
  const [selected, setSelected] = useState<Companion[]>([]);
  const [creating, setCreating] = useState(false);
  const [options, setOptions] = useState<PickerOptions>({ premade: [], custom: [] });

  useEffect(() => {
    let live = true;
    (async () => {
      const [rows, profile] = await Promise.all([
        listCompanions(200),
        fetch("/api/profile").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (!live) return;
      const me = profile?.id as string | undefined;
      const named = rows.map((r) => ({ ...r, name: localizedName(r, locale) }));
      setOptions({
        premade: named.filter((r) => !r.isCustom),
        custom: named.filter((r) => r.isCustom && (!me || r.userId === me)),
      });
    })();
    return () => {
      live = false;
    };
  }, []);

  const ids = selected.map((c) => c.id);
  const canCreate = selected.length >= 2 && selected.length <= 3;

  async function create() {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const j = await jfetch<{ groupId: string }>("/api/groupchats/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companionIds: ids }),
      });
      router.push(`/groupchat/${j.groupId}`);
    } catch (e) {
      setCreating(false);
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="min-h-screen">
      {creating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            {t("creatingGroup", { default: "Setting up your group chat..." })}
          </p>
        </div>
      )}
      <div>
        <Breadcrumbs items={[{ label: tb("groupChat", { default: "AI Group Chat" }) }]} />
        <main
          className={cn("max-w-7xl mx-auto px-4 md:px-6 py-6", selected.length > 0 && "pb-28")}
        >
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">
              <span className="text-gradient">{t("lobbyTitle", { default: "AI Group Chat" })}</span>
              {" – "}
              {t("lobbyHeadingSuffix", { max: 3, default: "Select up to 3 AI Characters" })}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" onClick={() => router.push("/chats?tab=group")} className="font-semibold">
                <History className="h-4 w-4 mr-1.5" />
                {t("history", { default: "History" })}
              </Button>
            </div>
          </div>
          <CompanionPicker
            options={options}
            selectedIds={ids}
            maxMembers={3}
            onToggle={(c) =>
              setSelected((prev) =>
                prev.some((x) => x.id === c.id)
                  ? prev.filter((x) => x.id !== c.id)
                  : prev.length >= 3
                    ? prev
                    : [...prev, c],
              )
            }
          />
        </main>
      </div>
      <div
        className={cn(
          "fixed bottom-0 inset-x-0 z-40 lg:pl-64 transition-transform duration-300",
          selected.length > 0 ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="border-t border-border/50 bg-background/30 backdrop-blur-xl">
          <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-center">
            <Button onClick={create} disabled={!canCreate || creating} className="gradient-cta font-semibold disabled:opacity-50 h-12 px-8 text-base">
              {creating && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
              <span className="flex items-center gap-1.5">
                {t("createGroup", { default: "Create Group Chat" })}
                <CoinIcon size={14} />
                1
              </span>
            </Button>
            <span className="absolute right-4 md:right-6 text-2xl font-bold text-foreground whitespace-nowrap">
              {t("selectedCount", { count: selected.length, max: 3, default: `${selected.length}/3` })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* /groupchat/[id] — deep-linkable room */
export function GroupChatRoomById({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [group, setGroup] = useState<Group | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    jfetch<{ groups: Group[] }>("/api/groupchats")
      .then((j) => live && setGroup((j.groups || []).find((g) => g.id === id) || null))
      .catch(() => live && setGroup(null));
    return () => {
      live = false;
    };
  }, [id]);

  if (group === undefined) {
    return <div className="glass-effect mx-auto my-6 h-64 max-w-3xl animate-pulse rounded-2xl" />;
  }
  if (group === null) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">群聊不存在或已删除</p>
        <button
          onClick={() => router.push(pathname.startsWith("/en") ? "/en/groupchat" : "/groupchat")}
          className="gradient-cta mt-4 h-10 rounded-full px-6 text-sm font-bold text-white"
        >
          返回群聊列表
        </button>
      </main>
    );
  }
  return (
    <GroupRoom
      group={group}
      onBack={() => router.push(pathname.startsWith("/en") ? "/en/groupchat" : "/groupchat")}
      onChanged={() => {}}
    />
  );
}

function fmtTime(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/* bubbles follow the chat-room primitives (components/chat-view.tsx) */
function UserBubble({ text, time }: { text: string; time: string }) {
  const shown = text.replace(/^\[media-request:(?:image|video)\]([\s\S]*)\[\/media-request\]$/, "$1");
  return (
    <div className="flex mb-4 justify-end">
      <div className="flex flex-col gap-1 max-w-[85%] md:max-w-[70%] items-end">
        <div className="glass-bubble-pink text-foreground rounded-2xl px-3 md:px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap w-fit max-w-full">
          {shown}
        </div>
        {time && <span className="text-xs text-muted-foreground">{time}</span>}
      </div>
    </div>
  );
}

function AssistantBubble({
  text,
  time,
  name,
  avatar,
}: {
  text: string;
  time: string;
  name?: string | null;
  avatar?: string | null;
}) {
  const mImg = text.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (mImg) {
    return (
      <div className="flex gap-2 mb-4">
        {avatar && (
          <div className="w-8 flex-shrink-0">
            <span className="relative block h-8 w-8 rounded-full overflow-hidden">
              <AvatarImg src={avatar} name={name} className="object-cover h-full w-full" />
            </span>
          </div>
        )}
        <div className="flex flex-col gap-1 max-w-[85%] md:max-w-[70%] min-w-0">
          {name && (
            <span className="text-xs font-medium text-muted-foreground px-1">{name.split(" ")[0]}</span>
          )}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-container">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mImg[2]} alt={mImg[1]} className="max-h-96 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2 px-1">
            {time && <span className="text-xs text-muted-foreground">{time}</span>}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 mb-4">
      {avatar && (
        <div className="w-8 flex-shrink-0">
          <span className="relative block h-8 w-8 rounded-full overflow-hidden">
            <AvatarImg src={avatar} name={name} className="object-cover h-full w-full" />
          </span>
        </div>
      )}
      <div className="flex flex-col gap-1 max-w-[85%] md:max-w-[70%] min-w-0">
        {name && (
          <span className="text-xs font-medium text-muted-foreground px-1">
            {name.split(" ")[0]}
          </span>
        )}
        <div className="rounded-2xl bg-surface-container border border-border px-3 md:px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap w-fit max-w-full text-foreground">
          {text}
        </div>
        <div className="flex items-center gap-2 px-1">
          <button
            onClick={() => toast("功能待开发！")}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary transition-colors hover:border-primary/60 hover:bg-primary/20 disabled:opacity-50"
            aria-label="play voice"
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>
          {time && <span className="text-xs text-muted-foreground">{time}</span>}
        </div>
      </div>
    </div>
  );
}

function GroupRoom({
  group,
  onBack,
  onChanged,
}: {
  group: Group;
  onBack: () => void;
  onChanged: () => void;
}) {
  const t = useTranslations("groupChat");
  const [msgs, setMsgs] = useState<GroupMessage[]>(group.messages || []);
  const [imgOpen, setImgOpen] = useState(false);
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgBusy, setImgBusy] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    const now = new Date().toISOString();
    setMsgs((m) => [...m, { id: "tmp-u-" + Date.now(), role: "user", content: text, createdAt: now }]);
    try {
      const j = await jfetch<{ replies: { id: string; companionId: string; companionName: string; content: string }[] }>(
        "/api/groupchats/message",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: group.id, text }),
        },
      );
      setMsgs((m) => [
        ...m,
        ...(j.replies || []).map((r) => ({
          id: r.id,
          role: "assistant" as const,
          content: r.content,
          companionId: r.companionId,
          companionName: r.companionName,
          createdAt: new Date().toISOString(),
        })),
      ]);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const byId = Object.fromEntries(group.companions.map((c) => [c.id, c]));

  async function generateGroupImage() {
    const prompt = imgPrompt.trim();
    if (!prompt || imgBusy) return;
    setImgBusy(true);
    try {
      const r = await fetch("/api/groupchats/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ groupId: group.id, prompt }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || j.error || "failed");
      const now = new Date().toISOString();
      setMsgs((m) => [
        ...m,
        { id: "tmp-u-" + Date.now(), role: "user", content: `[media-request:image]${prompt}[/media-request]`, createdAt: now } as GroupMessage,
        { id: j.messageId, role: "assistant", companionId: j.authorId, companionName: j.authorName, content: `![${prompt}](${j.url})`, createdAt: now } as GroupMessage,
      ]);
      setImgOpen(false);
      setImgPrompt("");
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    } finally {
      setImgBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 md:px-6">
        <button onClick={onBack} className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex -space-x-2">
          {group.companions.map((m) => (
            <AvatarImg key={m.id} src={m.imageUrl} name={m.name} className="size-8 rounded-full border-2 border-background object-cover" />
          ))}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{group.name}</h2>
          <p className="text-[11px] text-muted-foreground">{group.companions.map((m) => m.name).join("、")}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-6 pl-4 pr-4 md:px-6">
        <div ref={scrollRef} className="sw-scroll min-h-0 flex-1 space-y-4 overflow-y-auto">
          {msgs.map((m) =>
            m.role === "user" ? (
              <UserBubble key={m.id} text={m.content} time={fmtTime(m.createdAt)} />
            ) : (
              <AssistantBubble
                key={m.id}
                text={m.content}
                time={fmtTime(m.createdAt)}
                name={m.companionName}
                avatar={m.companionId ? byId[m.companionId]?.imageUrl : null}
              />
            ),
          )}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block size-2 animate-pulse rounded-full bg-primary" />
              {t("typing", { default: " typing" })}…
            </div>
          )}
        </div>

        <div className="p-3 md:p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <div
              id="chat-input-area"
              className="glass-effect rounded-full flex items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-4 sm:py-2"
            >
              <div id="chat-media-icons" className="flex items-center gap-1">
                <button
                  type="button"
                  title={t("generateImage", { default: "生成图像" })}
                  onClick={() => setImgOpen(true)}
                  className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
                >
                  <ImageIcon className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  title={t("generateVideo", { default: "生成视频" })}
                  onClick={() => toast("功能待开发！")}
                  className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
                >
                  <Film className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  title={t("sendAGift", { default: "送礼物" })}
                  onClick={() => toast("功能待开发！")}
                  className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
                >
                  <Gift className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="relative flex-1 min-w-0">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  className="block w-full bg-transparent border-0 outline-none text-foreground resize-none py-3 min-h-[44px] max-h-[120px] text-sm"
                />
                {!input && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex items-center text-muted-foreground"
                  >
                    <span className="min-w-0 w-full truncate">{t("writeMessage", { default: "写消息..." })}</span>
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={!input.trim() || busy}
                className="h-10 w-10 rounded-full gradient-cta hover:opacity-90 transition-opacity flex-shrink-0 flex items-center justify-center text-white disabled:opacity-40"
                aria-label="send"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5"
                >
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
        {imgOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !imgBusy && setImgOpen(false)}>
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface-container-lowest p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-foreground">生成图像</h3>
              <p className="mt-1 text-xs text-muted-foreground">描述你想让群聊角色生成的画面，完全免费</p>
              <textarea
                value={imgPrompt}
                onChange={(e) => setImgPrompt(e.target.value)}
                placeholder="例如：海滩日落合影…"
                className="glass-effect mt-3 min-h-24 w-full resize-none rounded-xl bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setImgOpen(false)} disabled={imgBusy} className="h-9 rounded-full px-4 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">取消</button>
                <button onClick={generateGroupImage} disabled={imgBusy || !imgPrompt.trim()} className="gradient-cta h-9 rounded-full px-5 text-sm font-bold text-white disabled:opacity-40">
                  {imgBusy ? "生成中…" : "生成"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
