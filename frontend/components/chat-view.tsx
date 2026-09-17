"use client";

// Chat conversation view — client architecture:
// Vercel AI SDK v5 useChat + DefaultChatTransport streaming from our local
// backend's SSE endpoint (/api/chat/message), history seeded from the DB
// through the PostgREST-compatible surface, DB row -> UIMessage conversion
// identical to the reference markdown converter.
// Markup: left chat column (glass-bubble lines,
// pink TTS circle + text-xs timestamp, glass-effect rounded-full input bar
// with three ghost icons + gradient send) and a right panel
// (glass-inset grid-cols-3 pill tabs, aspect-[3/4] carousel with white pill
// dots, glass-card action triplet) scrolling independently.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { UserMenu } from "@/components/home/user-menu";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  Send,
  ImageIcon,
  Film,
  Gift,
  Volume2,
  Loader2,
  Square,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ChatSettingsModal } from "@/components/chat-settings-modal";
import {
  getCompanionBySlug,
  getGallery,
  getGifts,
  getHistoryByCompanion,
  getProfile,
  localizedWelcomeMessage,
  type Companion,
  type DbMessage,
  type Gift as GiftRow,
} from "@/lib/api";

// source converter: DB {id, role, content, createdAt} -> UIMessage
function toUIMessage(m: DbMessage): UIMessage {
  return {
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.content }],
    metadata: {
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
    },
  };
}

function fmtTime(iso?: unknown): string {
  const d = typeof iso === "string" ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function parseHobbies(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return raw.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  }
}

export function ChatView({ slug }: { slug: string }) {
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const comp = await getCompanionBySlug(slug);
      if (!alive) return;
      if (!comp) {
        setNotFound(true);
        return;
      }
      setCompanion(comp);
      const rows = await getHistoryByCompanion(comp.id);
      if (alive) setInitial(rows.map(toUIMessage));
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (notFound) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        角色不存在：<code className="text-primary">{slug}</code>
      </div>
    );
  }
  if (!companion || initial === null) {
    return <div className="p-6 text-sm text-muted-foreground">加载中…</div>;
  }
  return <ChatSession key={companion.id} companion={companion} initialMessages={initial} />;
}

function ChatSession({
  companion,
  initialMessages,
}: {
  companion: Companion;
  initialMessages: UIMessage[];
}) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [input, setInput] = useState("");
  const [tokens, setTokens] = useState<number | null>(null);
  const [panelTab, setPanelTab] = useState<"profile" | "gallery" | "gifts">("profile");
  const [gallery, setGallery] = useState<string[] | null>(null);
  const [gifts, setGifts] = useState<GiftRow[] | null>(null);
  const [slide, setSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat/message",
        prepareSendMessagesRequest: ({ messages, id }) => ({
          body: { id, messages, companionId: companion.id },
        }),
      }),
    [companion.id],
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
    messages: initialMessages,
  });

  const [profileInfo, setProfileInfo] = useState<{ nickname?: string | null; email?: string } | null>(null);
  const refreshTokens = useCallback(async () => {
    const p = await getProfile();
    if (p) {
      setTokens(p.tokens);
      setProfileInfo({ nickname: p.nickname, email: p.email });
    }
  }, []);

  useEffect(() => {
    refreshTokens();
  }, [refreshTokens, status]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  useEffect(() => {
    if (gallery === null) getGallery(companion.slug).then(setGallery);
    if (gifts === null) getGifts().then(setGifts);
  }, [gallery, gifts, companion.slug]);

  const slides = useMemo(() => {
    const list = [companion.imageUrl, ...((gallery || []) as Array<string | null>)].filter(
      (u): u is string => !!u,
    );
    return list.length ? list : [];
  }, [companion.imageUrl, gallery]);

  function submit() {
    const text = input.trim();
    if (!text || status === "streaming" || status === "submitted") return;
    setInput("");
    sendMessage({ text });
  }

  async function sendGift(g: GiftRow) {
    try {
      const res = await fetch("/api/chat/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companionId: companion.id, giftId: g.id }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.message || j.error || "gift failed");
      const am = j.assistantMessage;
      setMessages((prev) => [
        ...prev,
        {
          id: "gift-u-" + Date.now(),
          role: "user",
          parts: [{ type: "text", text: `送出礼物 ${g.emoji} ${g.name}` }],
          metadata: { createdAt: new Date().toISOString() },
        } as UIMessage,
        ...(am
          ? [
              {
                id: am.id,
                role: "assistant",
                parts: [{ type: "text", text: am.content }],
                metadata: { createdAt: am.createdAt },
              } as UIMessage,
            ]
          : []),
      ]);
      refreshTokens();
      toast.success(`${g.emoji} ${g.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  const streaming = status === "streaming" || status === "submitted";

  // chat media buttons — source ImageGenerationModal/VideoGenerationModal flow,
  // minimal wiring: generate a default portrait/clip and append the returned
  // markdown message bubble live (server already persisted it).
  const [mediaBusy, setMediaBusy] = useState<"image" | "video" | null>(null);
  async function generateMedia(kind: "image" | "video") {
    if (mediaBusy || streaming) return;
    setMediaBusy(kind);
    const tid = toast.loading(kind === "image" ? t("generatingImage") : t("generatingVideo"));
    try {
      const res = await fetch(kind === "image" ? "/api/media/image" : "/api/media/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "image"
            ? { companionId: companion.id, prompt: "", useReference: true, aspect: "3:4" }
            : { companionId: companion.id, prompt: `${companion.name} 的短视频`, duration: 5 },
        ),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.message || j.error || "generation failed");
      setMessages((prev) => [
        ...prev,
        {
          id: j.messageId || `media-${Date.now()}`,
          role: "assistant",
          parts: [{ type: "text", text: j.message }],
          metadata: { createdAt: new Date().toISOString() },
        } as UIMessage,
      ]);
      refreshTokens();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      toast.dismiss(tid);
      setMediaBusy(null);
    }
  }

  const router = useRouter();
  const innerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerH, setFooterH] = useState(0);
  const [maskL, setMaskL] = useState(0);
  const [maskD, setMaskD] = useState(0);
  const norm = useMemo(() => normalizeMessages(messages), [messages]);

  /* source MessageList: measure footer for padding + fade mask */
  useEffect(() => {
    const el = footerRef.current;
    if (!el) {
      setFooterH(0);
      return;
    }
    const measure = () => {
      const first = el.firstElementChild as HTMLElement | null;
      const padTop = first ? parseFloat(getComputedStyle(first).paddingTop) || 0 : 0;
      setFooterH(Math.max(0, el.offsetHeight - padTop - 16));
      const form = el.querySelector("form");
      const a = el.getBoundingClientRect().bottom;
      if (form) {
        const r = form.getBoundingClientRect();
        setMaskL(a - (r.top + r.height / 2));
        setMaskD(a - r.top);
      } else {
        setMaskL(el.offsetHeight / 2);
        setMaskD(el.offsetHeight / 2);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const mask = footerH ? `linear-gradient(to top, transparent ${maskL}px, #000 ${maskD}px)` : undefined;

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden">
      {/* room header — source ChatContent header row */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 md:px-4">
        <div className="flex min-w-0 items-center gap-1">
          <ChatSettingsModal companionId={companion.id} />
        </div>
        <div className="flex flex-shrink-0 items-center gap-2 md:gap-3">
          {profileInfo && <UserMenu user={profileInfo} />}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* conversation column — source MessageList (488705) */}
        <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
          <div
            ref={scrollRef}
            className="sw-scroll flex-1 min-h-0 overflow-y-auto px-4 md:px-6"
            style={mask ? { WebkitMaskImage: mask, maskImage: mask } : undefined}
          >
            <div ref={innerRef} className="pt-4 md:pt-6" style={{ overflowAnchor: "none", paddingBottom: footerH || undefined }}>
              {norm.length === 0 && !streaming && (() => {
                const wm = localizedWelcomeMessage(companion, locale);
                if (wm) {
                  // render as first assistant bubble (source ChatView seeds it
                  // into initialMessages; we display it inline for empty history)
                  return (
                    <div className="mb-4 flex">
                      <div className="flex flex-col gap-1 max-w-[85%] md:max-w-[70%] min-w-0">
                        <ContentRenderer content={wm} />
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="flex min-h-[40vh] items-center justify-center px-4 md:px-6">
                    <div className="text-center text-muted-foreground px-4">
                      <p className="text-base md:text-lg mb-2">{t("noChats")}</p>
                      <p className="text-sm">{t("noChatsDesc")}</p>
                    </div>
                  </div>
                );
              })()}
              {norm.map((m) => (
                <MessageRow key={m.id} m={m} companion={companion} />
              ))}
              {streaming && <TypingIndicator name={companion.name} imageUrl={companion.imageUrl} />}
            </div>
          </div>
          <div ref={footerRef} className="absolute inset-x-0 bottom-0 z-10">
            <ChatInputBar
              value={input}
              onChange={setInput}
              onSubmit={submit}
              busy={streaming}
              placeholder={t("writeMessage")}
              onImage={() => generateMedia("image")}
              onVideo={() => generateMedia("video")}
              onGift={() => setPanelTab("gifts")}
            />
          </div>
        </div>

        {/* profile panel (desktop) — source: hidden lg:block w-[440px] border-l */}
        <aside className="hidden lg:block w-[440px] shrink-0 min-h-0 border-l border-border">
          <div className="sw-scroll-overlay flex h-full w-full flex-col overflow-y-auto px-4 pb-6 pt-4">
            <div className="glass-inset grid h-auto w-full grid-cols-3 rounded-full p-1">
              {(
                [
                  ["profile", "个人资料"],
                  ["gallery", t("galleryTab")],
                  ["gifts", t("giftsTab")],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setPanelTab(id)}
                  className={
                    "flex h-9 items-center justify-center rounded-full text-sm font-bold transition-colors " +
                    (panelTab === id
                      ? "gradient-cta text-white"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {panelTab === "profile" && (
              <>
                {slides.length > 0 && (
                  <div className="relative mt-4 aspect-[3/4] w-full flex-shrink-0 overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slides[Math.min(slide, slides.length - 1)]}
                      alt={companion.name}
                      className="h-full w-full object-cover"
                    />
                    {slides.length > 1 && (
                      <>
                        <button
                          onClick={() => setSlide((s) => (s - 1 + slides.length) % slides.length)}
                          className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/65"
                          aria-label="prev"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setSlide((s) => (s + 1) % slides.length)}
                          className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/65"
                          aria-label="next"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
                          {slides.map((_, i) => (
                            <span
                              key={i}
                              className={
                                "h-2 rounded-full transition-all " +
                                (i === slide ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75")
                              }
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <ActionCard icon={ImageIcon} label="图片" onClick={() => toast(t("generatingImage"))} />
                  <ActionCard icon={Film} label="视频" onClick={() => toast(t("generatingVideo"))} />
                </div>
                <h2 className="mt-5 text-lg font-bold">{companion.name}</h2>
                {companion.bio && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{companion.bio}</p>
                )}
                <dl className="mt-4 space-y-2 text-sm">
                  <AttrRow label="年龄" value={companion.age != null ? String(companion.age) : undefined} />
                  <AttrRow label="体型" value={companion.body || undefined} />
                  <AttrRow label="种族" value={companion.ethnicity || undefined} />
                  <AttrRow label="关系状态" value={companion.relationship || undefined} />
                  <AttrRow label="职业" value={companion.occupation || undefined} />
                  <AttrRow label="性格" value={companion.personality || undefined} />
                  <AttrRow label="爱好" value={parseHobbies(companion.hobbies).join(", ") || undefined} />
                </dl>
              </>
            )}

            {panelTab === "gallery" && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {(gallery || []).map((u) => (
                  <div key={u} className="aspect-[3/4] overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
                {gallery !== null && gallery.length === 0 && (
                  <p className="col-span-2 py-8 text-center text-xs text-muted-foreground">暂无相册内容</p>
                )}
                {gallery === null && (
                  <p className="col-span-2 py-8 text-center text-xs text-muted-foreground">加载中…</p>
                )}
              </div>
            )}

            {panelTab === "gifts" && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {(gifts || []).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => sendGift(g)}
                    className="glass-card flex flex-col items-center gap-1 rounded-xl p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="text-3xl">{g.emoji}</span>
                    <span className="text-xs font-semibold">{g.name}</span>
                  </button>
                ))}
                {gifts !== null && gifts.length === 0 && (
                  <p className="col-span-2 py-8 text-center text-xs text-muted-foreground">暂无礼物</p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---- chat-room primitives ---- */

function firstName(name: string): string {
  return name.split(" ")[0] || name;
}

type NormMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
  showTimestamp: boolean;
  compact: boolean;
  authorName?: string | null;
  authorImageUrl?: string | null;
};

/* source eN(): paragraph-split assistant messages, compact consecutive runs */
function normalizeMessages(msgs: UIMessage[]): NormMsg[] {
  const out: NormMsg[] = [];
  for (const m of msgs) {
    const text = m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
    const createdAt = (m.metadata as { createdAt?: string } | undefined)?.createdAt;
    if (m.role === "assistant") {
      const paras = text.split(/\n+/).map((x) => x.trim()).filter((x) => x.length > 0);
      if (paras.length > 1) {
        paras.forEach((pTxt, i) => {
          out.push({
            id: `${m.id}-p${i}`,
            role: "assistant",
            text: pTxt,
            createdAt,
            showTimestamp: i === paras.length - 1,
            compact: false,
          });
        });
      } else {
        out.push({ id: m.id, role: "assistant", text, createdAt, showTimestamp: true, compact: false });
      }
    } else {
      const inner = text.match(/^\[media-request:(?:image|video)\]([\s\S]*)\[\/media-request\]$/);
      out.push({
        id: m.id,
        role: "user",
        text: inner ? inner[1] : text,
        createdAt,
        showTimestamp: true,
        compact: false,
      });
    }
  }
  for (let i = 0; i < out.length - 1; i++) {
    if (out[i].role === "assistant" && out[i + 1].role === "assistant") {
      out[i].showTimestamp = false;
      out[i].compact = true;
    }
  }
  return out;
}

/* source ex(): markdown image/video tokens + *action* italics inside glass-bubble */
function ContentRenderer({ content }: { content: string }) {
  const parts = content
    .split(/(!\[[\s\S]*?\]\(.*?\))|(\[video:[\s\S]*?\]\(.*?\))/g)
    .filter((x) => x !== undefined && x !== "");
  return (
    <>
      {parts.map((seg, i) => {
        const img = seg.match(/!\[([\s\S]*?)\]\((.*?)\)/);
        if (img) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={img[2]} alt={img[1]} className="rounded-lg w-[260px] sm:w-[300px] my-1" />
          );
        }
        const vid = seg.match(/\[video:([\s\S]*?)\]\((.*?)\)/);
        if (vid) {
          return <video key={i} src={vid[2]} controls className="rounded-lg w-[260px] sm:w-[300px]" title={vid[1]} />;
        }
        if (!seg.trim()) return null;
        const ital = seg.split(/(\*[^*]+\*)/g).filter(Boolean);
        return (
          <div
            key={i}
            className="glass-bubble text-foreground rounded-2xl px-3 md:px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap mb-1 w-fit max-w-full"
          >
            {ital.map((pTxt, j) =>
              pTxt.startsWith("*") && pTxt.endsWith("*") ? (
                <span key={j} className="text-primary italic">{pTxt}</span>
              ) : (
                <span key={j}>{pTxt}</span>
              ),
            )}
          </div>
        );
      })}
    </>
  );
}

/* source eg(): message row — TTS playback via /api/chat/tts (Edge neural voice) */
let currentTtsAudio: HTMLAudioElement | null = null;

function TtsRow({ time, text, companionId }: { time: string; text: string; companionId?: string }) {
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const onClick = async () => {
    if (playing) {
      audioRef.current?.pause();
      audioRef.current = null;
      if (currentTtsAudio && currentTtsAudio.paused) currentTtsAudio = null;
      setPlaying(false);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/chat/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, companionId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) {
        toast.error(j.message || j.error || "语音生成失败");
        return;
      }
      if (currentTtsAudio) currentTtsAudio.pause();
      const a = new Audio(j.url);
      audioRef.current = a;
      currentTtsAudio = a;
      a.onended = () => setPlaying(false);
      a.onerror = () => setPlaying(false);
      await a.play();
      setPlaying(true);
    } catch {
      toast.error("语音生成失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-1">
      <button
        onClick={onClick}
        disabled={busy}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary transition-colors hover:border-primary/60 hover:bg-primary/20 disabled:opacity-60"
        aria-label="play voice"
        title={playing ? "停止" : "朗读"}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : playing ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </button>
      <span className="text-xs text-muted-foreground">{fmtTime(time)}</span>
    </div>
  );
}

/* source eg(): assistant rows show avatar+name only when authorImageUrl exists
   (group chats); 1:1 rows are plain bubbles, standard chat DOM. */
function MessageRow({ m, companion }: { m: NormMsg; companion: Companion }) {
  if (m.role === "assistant") {
    if (m.authorImageUrl) {
      return (
        <div className={`flex gap-2 ${m.compact ? "mb-1" : "mb-4"}`}>
          <div className="w-8 flex-shrink-0">
            {!m.compact && (
              <span className="relative block h-8 w-8 rounded-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.authorImageUrl} alt={m.authorName || companion.name} className="h-full w-full object-cover" />
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1 max-w-[85%] md:max-w-[70%] min-w-0">
            {!m.compact && (
              <span className="text-xs font-medium text-muted-foreground px-1">
                {firstName(m.authorName || companion.name)}
              </span>
            )}
            <ContentRenderer content={m.text} />
            {m.showTimestamp && <TtsRow time={m.createdAt || ""} text={m.text} companionId={companion.id} />}
          </div>
        </div>
      );
    }
    return (
      <div className={`flex ${m.compact ? "mb-1" : "mb-4"}`}>
        <div className="flex flex-col gap-1 max-w-[85%] md:max-w-[70%] min-w-0">
          <ContentRenderer content={m.text} />
          {m.showTimestamp && <TtsRow time={m.createdAt || ""} text={m.text} companionId={companion.id} />}
        </div>
      </div>
    );
  }
  return (
    <div className={`flex ${m.compact ? "mb-1" : "mb-4"} justify-end`}>
      <div className="flex flex-col gap-1 max-w-[85%] md:max-w-[70%] items-end">
        <div className="glass-bubble-pink text-foreground rounded-2xl px-3 md:px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap w-fit max-w-full">
          {m.text}
        </div>
        {m.showTimestamp && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{fmtTime(m.createdAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* source ey(): typing indicator */
function TypingIndicator({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  return (
    <div className="flex gap-3 mb-4">
      <span className="h-10 w-10 rounded-full bg-surface-container overflow-hidden flex-shrink-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : null}
      </span>
      <div className="flex flex-col gap-1">
        <div className="rounded-2xl bg-surface-container border border-border">
          <div className="flex px-4 py-3 text-muted-foreground/50 gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-current animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* source 522085: ChatInput */
function ChatInputBar({
  value,
  onChange,
  onSubmit,
  busy,
  placeholder,
  onImage,
  onVideo,
  onGift,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  placeholder: string;
  onImage: () => void;
  onVideo: () => void;
  onGift: () => void;
}) {
  return (
    <div className="p-3 md:p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="glass-effect rounded-full flex items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-4 sm:py-2" id="chat-input-area">
          <div className="flex items-center gap-1" id="chat-media-icons">
            <button
              type="button"
              onClick={onImage}
              title="生成图片"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full hover:bg-surface-container-high"
            >
              <ImageIcon className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={onVideo}
              title="生成视频"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full hover:bg-surface-container-high"
            >
              <Film className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={onGift}
              title="送礼物"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full hover:bg-surface-container-high"
            >
              <Gift className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5 text-muted-foreground" />
            </button>
          </div>
          <div className="relative flex-1 min-w-0">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              rows={1}
              className="block w-full bg-transparent border-0 outline-none text-foreground resize-none py-3 min-h-[44px] max-h-[120px]"
            />
            {!value && (
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center text-muted-foreground">
                <span className="min-w-0 w-full truncate">{placeholder}</span>
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!value.trim() || busy}
            className="h-10 w-10 rounded-full gradient-cta hover:opacity-90 transition-opacity flex-shrink-0 flex items-center justify-center text-white disabled:opacity-40"
            aria-label="send"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: "green";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "glass-card flex flex-col items-center justify-center gap-1.5 rounded-lg px-2 py-3.5 transition-colors duration-200 active:scale-95 " +
        (tone === "green"
          ? "hover:border-green-500/40 hover:bg-green-500/5"
          : "hover:border-primary/40 hover:bg-primary/5")
      }
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function AttrRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-1.5">
      <dt className="flex-shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-xs">{value}</dd>
    </div>
  );
}
