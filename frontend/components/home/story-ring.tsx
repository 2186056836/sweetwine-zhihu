"use client";

// Story ring row +
// viewer, simplified desktop viewer: center frame + prev/next +
// close + like + reply-to-chat + seen tracking via localStorage, same keys
// persistent keys: ig-seen-story-ids / ig-liked-story-ids / ig-story-views-count).
import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Heart,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { ShimmerImage } from "@/components/shimmer-image";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { saveStoryReplyPayload, STORY_REPLY_QUERY_FLAG } from "@/lib/story-reply";
import { cn } from "@/lib/utils";

export type Story = {
  id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  firstFrameUrl: string;
  caption: string | null;
};

export type StoryGroup = {
  companion: { id: string; slug: string; name: string; imageUrl: string };
  stories: Story[];
  latestAt: string;
};

const SEEN_KEY = "ig-seen-story-ids";
const LIKED_KEY = "ig-liked-story-ids";
const VIEWS_KEY = "ig-story-views-count";

function readIds(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function hasUnseen(group: StoryGroup, seen: Set<string>): boolean {
  return group.stories.some((s) => !seen.has(s.id));
}

function firstUnseenIndex(stories: Story[], seen: Set<string>): number {
  const i = stories.findIndex((s) => !seen.has(s.id));
  return i === -1 ? 0 : i;
}

export function StoryRing({
  groups,
  isAuthenticated,
  isPremium,
}: {
  groups: StoryGroup[];
  isAuthenticated: boolean;
  isPremium: boolean;
}) {
  const { openAuthModal } = useAuthModal();
  const scroller = React.useRef<HTMLDivElement>(null);
  const [seen, setSeen] = React.useState<Set<string>>(() => new Set());
  const [liked, setLiked] = React.useState<Set<string>>(() => new Set());
  const [viewCount, setViewCount] = React.useState(0);
  const [canLeft, setCanLeft] = React.useState(false);
  const [canRight, setCanRight] = React.useState(false);
  const [desktop, setDesktop] = React.useState(false);
  const seenRef = React.useRef<Set<string>>(new Set());
  const lastTap = React.useRef(0);
  const [viewer, setViewer] = React.useState<{
    groups: StoryGroup[];
    initialGroupIndex: number;
    seeNewMode: boolean;
  } | null>(null);

  React.useEffect(() => {
    const s = new Set(readIds(SEEN_KEY));
    seenRef.current = s;
    setSeen(new Set(s));
    setLiked(new Set(readIds(LIKED_KEY)));
    const v = Number.parseInt(window.localStorage.getItem(VIEWS_KEY) || "0", 10);
    setViewCount(Number.isFinite(v) && v > 0 ? v : 0);
  }, []);

  const sorted = React.useMemo(() => {
    return [...groups].sort((a, b) => {
      const ua = hasUnseen(a, seen);
      const ub = hasUnseen(b, seen);
      if (ua !== ub) return ua ? -1 : 1;
      return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
    });
  }, [groups, seen]);

  const updateScrollButtons = React.useCallback(() => {
    setDesktop(window.matchMedia("(min-width: 640px)").matches);
    const el = scroller.current;
    if (el) {
      setCanLeft(el.scrollLeft > 8);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    }
  }, []);

  React.useEffect(() => {
    updateScrollButtons();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [updateScrollButtons, sorted.length]);

  const scrollBy = (dir: number) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const markSeen = React.useCallback((id: string) => {
    if (!seenRef.current.has(id)) {
      seenRef.current.add(id);
      setSeen(new Set(seenRef.current));
      writeIds(SEEN_KEY, seenRef.current);
    }
  }, []);

  if (sorted.length === 0) return null;

  const R = "72px";
  const mask = desktop
    ? canLeft && canRight
      ? `linear-gradient(to right, transparent, #000 ${R}, #000 calc(100% - ${R}), transparent)`
      : canRight
        ? `linear-gradient(to right, #000 calc(100% - ${R}), transparent)`
        : canLeft
          ? `linear-gradient(to right, transparent, #000 ${R})`
          : undefined
    : undefined;

  return (
    <>
      <div className="relative">
        <div
          ref={scroller}
          className="scrollbar-hide -mx-4 flex cursor-default gap-4 overflow-x-auto px-4 py-2 md:-mx-6 md:px-6"
          style={{ maskImage: mask, WebkitMaskImage: mask }}
        >
          {sorted.map((group, gi) => {
            const allSeen = group.stories.every((s) => seen.has(s.id));
            return (
              <button
                key={group.companion.id}
                type="button"
                onClick={() => {
                  if (Date.now() - lastTap.current < 350) return;
                  const seenNow = new Set(seen);
                  const seeNew =
                    !sorted.every((g) => g.stories.every((s) => seenNow.has(s.id))) &&
                    hasUnseen(group, seenNow);
                  const pool = seeNew ? sorted.filter((g) => hasUnseen(g, seenNow)) : sorted;
                  const groupIndex = seeNew
                    ? pool.findIndex((g) => g.companion.id === group.companion.id)
                    : gi;
                  const landing =
                    group.stories[seeNew ? firstUnseenIndex(group.stories, seenNow) : 0];
                  if (!landing || isPremium || isAuthenticated || seen.has(landing.id) || !(viewCount >= 5)) {
                    setViewer({
                      groups: pool,
                      initialGroupIndex: groupIndex === -1 ? 0 : groupIndex,
                      seeNewMode: seeNew,
                    });
                  } else {
                    openAuthModal();
                  }
                }}
                className="flex w-[88px] flex-shrink-0 flex-col items-center gap-1.5 focus:outline-none"
              >
                <span
                  className={cn(
                    "rounded-full p-[2.5px]",
                    allSeen
                      ? "bg-surface-container-high"
                      : "bg-[linear-gradient(135deg,#FFB0DA_0%,#FF6EB3_55%,#E94E97_100%)]",
                  )}
                >
                  <span className="block rounded-full border-2 border-background">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={group.companion.imageUrl} alt={group.companion.name} />
                    </Avatar>
                  </span>
                </span>
                <span className="w-full truncate text-center text-xs text-muted-foreground">
                  {group.companion.name}
                </span>
              </button>
            );
          })}
        </div>
        {canLeft && (
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Previous stories"
            className="absolute left-2 top-[calc(0.5rem+2.5px+2px+2.5rem)] z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
        )}
        {canRight && (
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Next stories"
            className="absolute right-2 top-[calc(0.5rem+2.5px+2px+2.5rem)] z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex"
          >
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
        )}
      </div>
      {viewer && (
        <StoryViewer
          groups={viewer.groups}
          initialGroupIndex={viewer.initialGroupIndex}
          seen={seenRef}
          liked={liked}
          onLikedChange={(next) => {
            setLiked(new Set(next));
            writeIds(LIKED_KEY, next);
          }}
          onViewed={markSeen}
          onNewView={() => {
            setViewCount((v) => {
              const next = v + 1;
              try {
                window.localStorage.setItem(VIEWS_KEY, String(next));
              } catch {
                /* ignore */
              }
              return next;
            });
          }}
          onClose={() => {
            lastTap.current = Date.now();
            setViewer(null);
          }}
        />
      )}
    </>
  );
}

function StoryViewer({
  groups,
  initialGroupIndex,
  seen,
  liked,
  onLikedChange,
  onViewed,
  onNewView,
  onClose,
}: {
  groups: StoryGroup[];
  initialGroupIndex: number;
  seen: React.MutableRefObject<Set<string>>;
  liked: Set<string>;
  onLikedChange: (next: Set<string>) => void;
  onViewed: (id: string) => void;
  onNewView: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("stories");
  const router = useRouter();
  const [groupIndex, setGroupIndex] = React.useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = React.useState(() =>
    firstUnseenIndex(groups[initialGroupIndex]?.stories ?? [], seen.current),
  );
  const [paused, setPaused] = React.useState(false);
  const [muted, setMuted] = React.useState(true);
  const [reply, setReply] = React.useState("");
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  React.useEffect(() => {
    onNewView();
    if (story) onViewed(story.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  React.useEffect(() => {
    if (!story || story.mediaType !== "video" || !videoRef.current) return;
    if (paused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [paused, story]);

  if (!group || !story) return null;

  const nextStory = () => {
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(firstUnseenIndex(groups[groupIndex + 1].stories, seen.current));
    } else {
      onClose();
    }
  };

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      const prev = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStoryIndex(prev.stories.length - 1);
    }
  };

  const toggleLike = () => {
    const next = new Set(liked);
    if (next.has(story.id)) next.delete(story.id);
    else next.add(story.id);
    onLikedChange(next);
  };

  const sendReply = () => {
    const text = reply.trim();
    if (!text) return;
    saveStoryReplyPayload({
      storyId: story.id,
      liked: liked.has(story.id),
      text,
      companionSlugOrId: group.companion.slug || group.companion.id,
      firstFrameUrl: story.firstFrameUrl,
    });
    router.push(`/chat/${group.companion.slug || group.companion.id}?${STORY_REPLY_QUERY_FLAG}=1`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden overscroll-none bg-black/90 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute right-4 top-4 z-[110] rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-6 w-6" />
      </button>
      <div className="relative mx-auto h-full max-w-[520px]">
        {/* progress bars */}
        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 p-2">
          {group.stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-200"
                style={{ width: i < storyIndex ? "100%" : i === storyIndex ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>
        {/* header */}
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center gap-2 px-3 pb-6 pl-3 pr-3 pt-5">
          <div className="flex min-h-9 items-center gap-2">
            <Avatar className="h-8 w-8 ring-2 ring-white/70">
              <AvatarImage src={group.companion.imageUrl} alt={group.companion.name} />
            </Avatar>
            <span className="text-sm font-semibold text-white drop-shadow">
              {group.companion.name}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="rounded-full p-2 text-white/90"
              aria-label={muted ? t("unmute", { default: "Unmute" }) : t("mute", { default: "Mute" })}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="rounded-full p-2 text-white/90"
              aria-label={paused ? t("play", { default: "Play" }) : t("pause", { default: "Pause" })}
            >
              {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {/* media */}
        <div className="absolute inset-0 bg-black">
          {story.mediaType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.mediaUrl}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <video
              ref={videoRef}
              src={story.mediaUrl}
              poster={story.firstFrameUrl}
              className="h-full w-full object-cover"
              playsInline
              preload="auto"
              muted={muted}
              crossOrigin="anonymous"
              onEnded={nextStory}
            />
          )}
        </div>
        {/* nav arrows */}
        <button
          type="button"
          onClick={prevStory}
          aria-label={t("previous", { default: "Previous" })}
          className="absolute left-2 top-1/2 z-[110] -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={nextStory}
          aria-label={t("next", { default: "Next" })}
          className="absolute right-2 top-1/2 z-[110] -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
        {/* reply bar */}
        <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
          <div className="flex min-h-[40px] flex-1 items-center rounded-full border border-border bg-black/60 px-4 py-2 backdrop-blur-sm">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendReply();
                }
              }}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              placeholder={t("replyPlaceholder", { name: group.companion.name })}
              className="w-full bg-transparent text-base text-white placeholder:text-white/75 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={sendReply}
            aria-label={t("send", { default: "Send" })}
            className="rounded-full p-2 text-white/90"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={toggleLike}
            aria-label={t("like", { default: "Like" })}
            className="rounded-full p-2"
          >
            <Heart
              className={cn(
                "h-7 w-7 drop-shadow",
                liked.has(story.id) ? "fill-primary text-primary" : "text-primary",
              )}
            />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
