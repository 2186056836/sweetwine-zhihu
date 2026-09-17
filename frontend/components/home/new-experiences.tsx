"use client";

//  —
// "New experiences" horizontal rail. The live-webcam and Sweet Movies cards
// were removed along with those features; the rail keeps the roleplay card.
import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShimmerImage } from "@/components/shimmer-image";
import { publicStorageUrl } from "@/lib/public-storage-url";

const ROLEPLAY_COVER = publicStorageUrl("web-resources/roleplaycover.jpeg");

const CARD_W = "w-[182px] shrink-0 sm:w-[208px] lg:w-[226px";

function EntryCard({
  imageUrl,
  label,
  onClick,
}: {
  imageUrl: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="relative aspect-[3/4] cursor-pointer overflow-hidden rounded-2xl border border-border glass-flat shadow transition-[transform,box-shadow] duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <ShimmerImage
        src={imageUrl}
        alt={label}
        fill
        className="rounded-[inherit] object-cover"
        sizes="(max-width:639px) 60vw, 260px"
      />
    </div>
  );
}

export function NewExperiences() {
  const t = useTranslations("newExperiences");
  const roleplay = useTranslations("roleplay");
  const router = useRouter();
  const scroller = React.useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = React.useState(false);
  const [canRight, setCanRight] = React.useState(false);
  const [desktop, setDesktop] = React.useState(false);

  const update = React.useCallback(() => {
    setDesktop(window.matchMedia("(min-width: 640px)").matches);
    const el = scroller.current;
    if (el) {
      setCanLeft(el.scrollLeft > 8);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    }
  }, []);

  React.useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollBy = (dir: number) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const R = "72px";
  const mask = desktop
    ? canLeft && canRight
      ? `linear-gradient(to right, transparent, #000 ${R}, #000 calc(100% - ${R}), transparent)`
      : canRight
        ? `linear-gradient(to right, #000 calc(100% - ${R}), transparent)`
        : canLeft
          ? `linear-gradient(to left, transparent, #000 ${R})`
          : undefined
    : undefined;

  return (
    <section>
      <h2 className="text-3xl font-bold mb-4">
        {t.rich("title", { gradient: (chunks) => <span className="text-gradient">{chunks}</span> })}
      </h2>
      <div className="relative">
        {canLeft && (
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label={t("scrollPrev", { default: "Scroll left" })}
            className="absolute left-1 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
        )}
        <div
          ref={scroller}
          className="scrollbar-hide -mx-4 -my-12 flex gap-3 md:gap-6 overflow-x-auto px-4 py-12 md:-mx-6 md:px-6"
          style={{ maskImage: mask, WebkitMaskImage: mask }}
        >
          <div className={CARD_W}>
            <EntryCard imageUrl={ROLEPLAY_COVER} label={roleplay("lobbyTitle")} onClick={() => router.push("/roleplay")} />
          </div>
        </div>
        {canRight && (
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label={t("scrollNext", { default: "Scroll right" })}
            className="absolute right-1 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex"
          >
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
        )}
      </div>
    </section>
  );
}
