"use client";

// promotional banner
// carousel: 5 banners, 6s auto-advance via progress-bar animation end,
// crossfade slides, arrows + dot tablist, click -> /subscriptions or auth.
import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShimmerImage } from "@/components/shimmer-image";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { publicStorageUrl } from "@/lib/public-storage-url";
import { cn } from "@/lib/utils";

const BANNERS_BASE = publicStorageUrl("web-resources/banners");

export const MARKETING_BANNERS = [
  {
    id: "chat-with-us",
    src: `${BANNERS_BASE}/chat-with-us-banner.webp`,
    alt: "Chat with AI characters who change the game.",
  },
  {
    id: "ai-group-chat",
    src: `${BANNERS_BASE}/ai-groupchat-banner-2.webp`,
    alt: "New: AI Group Chat — chat with up to 3 AI characters together.",
  },
  {
    id: "generate-your-ai",
    src: `${BANNERS_BASE}/generate-your-ai.webp`,
    alt: "Generate stunning AI images of your companion in seconds.",
  },
  {
    id: "create-ai-character",
    src: `${BANNERS_BASE}/create-ai-character.webp`,
    alt: "Create your own AI character — choose look, voice, and personality.",
  },
];

export const MARKETING_BANNER_INTERVAL_MS = 6000;
// banner click targets (used to all push /subscriptions — site is fully free now)
const BANNER_LINKS: Record<string, string> = {
  "ai-group-chat": "/groupchat",
  "generate-your-ai": "/generate-image",
  "create-ai-character": "/create",
};

export function MarketingBannerCarousel({
  isAuthenticated,
  banners = MARKETING_BANNERS,
  intervalMs = MARKETING_BANNER_INTERVAL_MS,
  className,
  aspectClassName = "aspect-[4/1]",
}: {
  isAuthenticated: boolean;
  banners?: typeof MARKETING_BANNERS;
  intervalMs?: number;
  className?: string;
  aspectClassName?: string;
}) {
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const [index, setIndex] = React.useState(0);
  const count = banners.length;

  const goTo = React.useCallback(
    (i: number) => {
      if (count !== 0) setIndex(((i % count) + count) % count);
    },
    [count],
  );

  // fallback auto-advance: some embedded webviews drop animationend for
  // fill:forwards animations, so track the progress bar with a timer
  React.useEffect(() => {
    const id = window.setTimeout(() => goTo(index + 1), intervalMs);
    return () => window.clearTimeout(id);
  }, [index, intervalMs, goTo]);

  const onClick = React.useCallback(() => {
    const href = BANNER_LINKS[banners[index]?.id ?? ""] || "/";
    if (isAuthenticated) {
      router.push(href);
    } else {
      openAuthModal(href);
    }
  }, [isAuthenticated, router, openAuthModal, banners, index]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promotional banners"
      className={cn("relative w-full overflow-hidden rounded-2xl glass-flat", className)}
    >
      <div className={cn("relative w-full", aspectClassName)}>
        {banners.map((b, i) => {
          const active = i === index;
          return (
            <div
              key={b.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${i + 1} of ${count}`}
              aria-hidden={!active}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none",
                active ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <button
                type="button"
                onClick={onClick}
                aria-label={b.alt}
                tabIndex={active ? 0 : -1}
                className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ShimmerImage
                  src={b.src}
                  alt={b.alt}
                  fill
                  priority={i === 0}
                  quality={95}
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  className="object-cover"
                  draggable={false}
                />
              </button>
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous banner"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 p-2 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:block"
          >
            <ChevronLeft className="h-7 w-7" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next banner"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 p-2 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:block"
          >
            <ChevronRight className="h-7 w-7" aria-hidden />
          </button>
          <div
            role="tablist"
            aria-label="Select banner"
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5"
          >
            {banners.map((b, i) => {
              const active = i === index;
              return (
                <button
                  key={b.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-current={active ? "true" : undefined}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => goTo(i)}
                  className={cn(
                    "relative h-1.5 overflow-hidden rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "w-5 bg-foreground/30" : "w-1.5 bg-foreground/30 hover:bg-foreground/50",
                  )}
                >
                  {active && (
                    <span
                      key={index}
                      onAnimationEnd={() => goTo(index + 1)}
                      style={{ animationDuration: `${intervalMs}ms` }}
                      className="animate-hero-progress absolute inset-y-0 left-0 w-full origin-left rounded-full bg-primary motion-reduce:animate-none"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {`Slide ${index + 1} of ${count}: ${banners[index].alt}`}
          </span>
        </>
      )}
    </section>
  );
}
