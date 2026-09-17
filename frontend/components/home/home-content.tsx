"use client";

// (HomeContent main export) — signed-in
// home dashboard: banner carousel (5/1), story ring, new-experiences rail,
// character grid with filter panel + promo slots + infinite scroll, home
// promo banner card, lazy FAQ.
import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { MarketingBannerCarousel } from "./marketing-banner-carousel";
import { AmbientGlow } from "@/components/marketing/landing-home";
import { StoryRing, type StoryGroup } from "./story-ring";
import { NewExperiences } from "./new-experiences";
import { CharacterGrid, CharacterFilters, type PromoSlot } from "./character-grid";
import type { HomeCompanion } from "./character-card";
import { Card } from "@/components/ui/badge-card";
import { Badge } from "@/components/ui/badge-card";
import { ShimmerImage } from "@/components/shimmer-image";
import { publicStorageUrl } from "@/lib/public-storage-url";
import { cn } from "@/lib/utils";

const GROUPCHAT_COVER = publicStorageUrl("web-resources/groupchatcover.webp");
export const HOME_PROMO_BANNER = {
  id: "generate-your-ai",
  src: publicStorageUrl("web-resources/banners/generate-your-ai.webp"),
  alt: "Generate stunning AI images of your companion in seconds.",
};

function GroupChatPromoCard({ onClick, className }: { onClick: () => void; className?: string }) {
  const t = useTranslations("groupChat");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("promoCta", { default: "Create New" })}
      style={{ borderWidth: 2 }}
      className={cn(
        "group relative block w-full overflow-hidden rounded-lg gradient-border cursor-pointer transition-[transform,box-shadow] duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <ShimmerImage
          src={GROUPCHAT_COVER}
          alt={t("promoCta", { default: "Create New" })}
          fill
          quality={90}
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent z-20" />
        <div className="absolute bottom-0 left-0 right-0 p-4 z-30 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground leading-snug">
            {t("promoSubtitle", { default: "with up to 3 characters" })}
          </p>
          <span className="inline-flex items-center justify-center rounded-full gradient-cta px-5 py-2 text-sm font-semibold text-white transition-opacity group-hover:opacity-90">
            {t("promoCta", { default: "Create New" })}
          </span>
        </div>
      </div>
    </button>
  );
}

function FunnelIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />
    </svg>
  );
}

export function HomeContent({
  isAuthenticated,
  isPremium,
  storyGroups,
  initialArchetype,
}: {
  isAuthenticated: boolean;
  isPremium: boolean;
  storyGroups: StoryGroup[];
  initialArchetype: string;
}) {
  const t = useTranslations("landing.characters");
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({
    archetype: initialArchetype,
    ethnicity: "all",
    body: "all",
    age: "all",
    relationship: "all",
  });
  // topbar tabs navigate via ?archetype=; the server page re-renders with a new
  // prop but useState only seeds on mount — sync prop changes into the filters
  React.useEffect(() => {
    setFilters((f) =>
      f.archetype === initialArchetype ? f : { ...f, archetype: initialArchetype },
    );
  }, [initialArchetype]);
  const [companions, setCompanions] = React.useState<HomeCompanion[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const sentinel = React.useRef<HTMLDivElement | null>(null);
  const filtersKey = `${filters.archetype}|${filters.ethnicity}|${filters.body}|${filters.age}|${filters.relationship}`;
  const initialRef = React.useRef({ companions: [] as HomeCompanion[], hasMore: true });
  initialRef.current = { companions, hasMore };

  React.useEffect(() => {
    setCompanions(initialRef.current.companions);
    setPage(1);
    setHasMore(initialRef.current.hasMore);
  }, [filtersKey]);

  const loadPage = React.useCallback(
    async (nextPage: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          archetype: filters.archetype,
          ethnicity: filters.ethnicity,
          body: filters.body,
          age: filters.age,
          relationship: filters.relationship,
          page: String(nextPage),
          limit: "20",
        });
        const res = await fetch(`/api/companions/home?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        setCompanions((prev) => (nextPage === 1 ? data.companions : [...prev, ...data.companions]));
        setHasMore(data.hasMore);
        setPage(nextPage);
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  React.useEffect(() => {
    loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  React.useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !loading && hasMore) {
        loadPage(page + 1);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, page, loadPage]);

  const activeFilterCount = [filters.ethnicity, filters.body, filters.age, filters.relationship].filter(
    (v) => v !== "all",
  ).length;

  const promoSlots: PromoSlot[] = [];
  promoSlots.push({
    position: 10,
    key: "promo-group-chat",
    node: <GroupChatPromoCard onClick={() => router.push("/groupchat")} />,
  });

  return (
    <>
      <AmbientGlow />
      <main>
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
        <MarketingBannerCarousel isAuthenticated={isAuthenticated} aspectClassName="aspect-[5/1]" />
      </div>
      {storyGroups.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
          <StoryRing groups={storyGroups} isAuthenticated={isAuthenticated} isPremium={isPremium} />
        </div>
      )}
      <div
        id="characters"
        className={cn(
          "scroll-mt-24 max-w-7xl mx-auto px-4 md:px-6",
          storyGroups.length > 0 ? "pt-6 pb-8" : "pt-12 pb-8",
        )}
      >
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
              {t.rich("title", { gradient: (chunks) => <span className="text-gradient">{chunks}</span> })}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(
              "flex items-center gap-2 transition-colors",
              "border border-border rounded-full px-4 h-11 text-sm font-medium",
              filtersOpen && "bg-primary/10 border-primary/50 text-primary",
            )}
          >
            <FunnelIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t("filters")}</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                {activeFilterCount}
              </Badge>
            )}
          </button>
        </div>
        {filtersOpen && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-200">
            <CharacterFilters
              ethnicity={filters.ethnicity}
              body={filters.body}
              age={filters.age}
              relationship={filters.relationship}
              onEthnicityChange={(v) => setFilters((f) => ({ ...f, ethnicity: v }))}
              onBodyChange={(v) => setFilters((f) => ({ ...f, body: v }))}
              onAgeChange={(v) => setFilters((f) => ({ ...f, age: v }))}
              onRelationshipChange={(v) => setFilters((f) => ({ ...f, relationship: v }))}
            />
          </div>
        )}
        <CharacterGrid
          companions={companions}
          onCharacterClick={(c) => router.push(`/chat/${c.slug || c.id}`)}
          promoSlots={promoSlots}
        />
        {hasMore && <div ref={sentinel} className="h-10" aria-hidden />}
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
        <NewExperiences />
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-8">
        <Link
          href="/generate-image"
          aria-label={HOME_PROMO_BANNER.alt}
          className="relative block aspect-[5/1] w-full overflow-hidden rounded-2xl glass-flat focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ShimmerImage
            src={HOME_PROMO_BANNER.src}
            alt={HOME_PROMO_BANNER.alt}
            fill
            quality={95}
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
            draggable={false}
          />
        </Link>
      </div>
      </main>
    </>
  );
}
