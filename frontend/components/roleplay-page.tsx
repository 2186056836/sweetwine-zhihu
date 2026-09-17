"use client";

// /roleplay — 4-step wizard (RoleplayWizard)
// + 667152 (StepIndicator) + CreateStepTitleRow / OptionCard / ReviewChip.
// Step 1 character -> 2 tone -> 3 location -> 4 scene text; fixed bottom bar
// with Next / Create (coin cost). Creation posts the contract
// {companionId, locationId, tone, sceneOpening} and pushes /roleplay/<id>.
// The /roleplay/[id] room reuses the chat-room primitives.
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft, Check,  Dices, Loader2, Pencil } from "lucide-react";
import { CoinIcon } from "@/components/coin-icon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { listCompanions, localizedName, type Companion } from "@/lib/api";
import { CharacterCard } from "@/components/home/character-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AvatarImg } from "@/components/avatar-fallback";

/* catalogs */
const ROLEPLAY_TONES = [
  { id: "fun", emoji: "😄", titleKey: "tones.fun.title", descKey: "tones.fun.desc" },
  { id: "romantic", emoji: "💕", titleKey: "tones.romantic.title", descKey: "tones.romantic.desc" },
  { id: "flirty", emoji: "😏", titleKey: "tones.flirty.title", descKey: "tones.flirty.desc" },
  { id: "mysterious", emoji: "🕵️", titleKey: "tones.mysterious.title", descKey: "tones.mysterious.desc" },
  { id: "spooky", emoji: "👻", titleKey: "tones.spooky.title", descKey: "tones.spooky.desc" },
  { id: "action", emoji: "🔥", titleKey: "tones.action.title", descKey: "tones.action.desc" },
  { id: "dramatic", emoji: "🎭", titleKey: "tones.dramatic.title", descKey: "tones.dramatic.desc" },
  { id: "cozy", emoji: "🫶", titleKey: "tones.cozy.title", descKey: "tones.cozy.desc" },
];
const ROLEPLAY_LOCATIONS: Array<{ id: string; emoji: string; labelKey: string }> = [
  { id: "home", emoji: "🏠", labelKey: "locations.home" },
  { id: "cafe", emoji: "☕", labelKey: "locations.cafe" },
  { id: "restaurant", emoji: "🍽️", labelKey: "locations.restaurant" },
  { id: "bar", emoji: "🍸", labelKey: "locations.bar" },
  { id: "library", emoji: "📚", labelKey: "locations.library" },
  { id: "bookstore", emoji: "📖", labelKey: "locations.bookstore" },
  { id: "park", emoji: "🌳", labelKey: "locations.park" },
  { id: "garden", emoji: "🌷", labelKey: "locations.garden" },
  { id: "nightclub", emoji: "🪩", labelKey: "locations.nightclub" },
  { id: "casino", emoji: "🎰", labelKey: "locations.casino" },
  { id: "concert", emoji: "🎤", labelKey: "locations.concert" },
  { id: "theater", emoji: "🎭", labelKey: "locations.theater" },
  { id: "cinema", emoji: "🎬", labelKey: "locations.cinema" },
  { id: "carnival", emoji: "🎡", labelKey: "locations.carnival" },
  { id: "stadium", emoji: "🏟️", labelKey: "locations.stadium" },
  { id: "beach", emoji: "🏖️", labelKey: "locations.beach" },
  { id: "pool", emoji: "🏊", labelKey: "locations.pool" },
  { id: "spa", emoji: "💆", labelKey: "locations.spa" },
  { id: "hotel", emoji: "🛛️", labelKey: "locations.hotel" },
  { id: "rooftop", emoji: "🌆", labelKey: "locations.rooftop" },
  { id: "yacht", emoji: "⛵", labelKey: "locations.yacht" },
  { id: "cabin", emoji: "🛖", labelKey: "locations.cabin" },
  { id: "hotspring", emoji: "♨️", labelKey: "locations.hotspring" },
  { id: "skilodge", emoji: "🎿", labelKey: "locations.skilodge" },
  { id: "campsite", emoji: "🏕️", labelKey: "locations.campsite" },
  { id: "car", emoji: "🚗", labelKey: "locations.car" },
  { id: "train", emoji: "🚆", labelKey: "locations.train" },
  { id: "airport", emoji: "✈️", labelKey: "locations.airport" },
  { id: "cruise", emoji: "🛳️", labelKey: "locations.cruise" },
  { id: "museum", emoji: "🏛️", labelKey: "locations.museum" },
  { id: "office", emoji: "🏢", labelKey: "locations.office" },
  { id: "gym", emoji: "🏋️", labelKey: "locations.gym" },
  { id: "university", emoji: "🎓", labelKey: "locations.university" },
  { id: "mall", emoji: "🛍️", labelKey: "locations.mall" },
  { id: "hospital", emoji: "🏥", labelKey: "locations.hospital" },
];
const SCENE_IDEAS = [
  { id: "rain_awning", text: "We bump into each other in the rain and duck under the same awning." },
  { id: "staring_grin", text: "You catch me staring from across the room and walk over with a grin." },
  { id: "power_out", text: "The power goes out and we're left alone in the dark, laughing nervously." },
  { id: "spilled_drink", text: "I'm running late and accidentally spill my drink all over you." },
  { id: "stayed_behind", text: "We're the only two who stayed behind after everyone else left." },
  { id: "music_slows", text: "Our eyes meet just as the music slows down." },
  { id: "storm_inside", text: "A sudden storm traps us inside with nothing but time to talk." },
  { id: "seat_taken", text: "You sit down next to me and ask if the seat is taken." },
];
const ROLEPLAY_SCENE_MAX = 800;

/* source 667152 StepIndicator */
function StepIndicator({ current, total, className }: { current: number; total: number; className?: string }) {
  return (
    <div className={cn("w-full flex items-center justify-center py-3 px-4", className)}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors duration-200",
                done || active ? "bg-primary text-primary-foreground" : "bg-surface-container text-muted-foreground",
              )}
            >
              {n}
            </div>
            {n < total && (
              <div className={cn("w-6 sm:w-10 md:w-16 h-px mx-1 transition-colors duration-200", done ? "bg-primary/50" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* source CreateStepTitleRow */
function CreateStepTitleRow({ title, canGoBack, onBack }: { title: string; canGoBack?: boolean; onBack?: () => void }) {
  return (
    <div className="relative flex items-center justify-center h-9 mb-3">
      {canGoBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="absolute left-0 flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
    </div>
  );
}

/* source OptionCard */
function OptionCard({
  emoji,
  title,
  description,
  isSelected,
  onClick,
}: {
  emoji: string;
  title: string;
  description?: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-4 text-center transition-colors duration-200",
        description ? "min-h-[128px]" : "min-h-[96px]",
        isSelected ? "border-primary bg-primary/10 ring-2 ring-primary/50" : "border-transparent glass-flat hover:border-border",
      )}
    >
      <span className="text-3xl leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {description && <span className="text-xs text-muted-foreground leading-snug">{description}</span>}
      {isSelected && (
        <span className="absolute top-2.5 right-2.5 z-10">
          <span className="block rounded-full bg-primary p-0.5">
            <Check className="h-3 w-3 text-white" />
          </span>
        </span>
      )}
    </button>
  );
}

/* source ReviewChip */
function ReviewChip({
  label,
  value,
  emoji,
  imageUrl,
  onEdit,
}: {
  label: string;
  value: string;
  emoji?: string;
  imageUrl?: string | null;
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group flex items-center gap-2 rounded-xl border border-border glass-flat p-2.5 text-left transition-colors hover:border-primary/50"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-2xl leading-none" aria-hidden>
          {emoji}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="block truncate text-sm font-medium text-foreground">{value}</span>
      </span>
      <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </button>
  );
}

type PickedCompanion = { id: string; name: string; imageUrl: string | null };

export function RoleplayPage() {
  const t = useTranslations("roleplay");
  const g = useTranslations("generate");
  const router = useRouter();
  const locale = useLocale();
  const [step, setStep] = useState(1);
  const [companion, setCompanion] = useState<PickedCompanion | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [tone, setTone] = useState<string | null>(null);
  const [scene, setScene] = useState("");
  const [creating, setCreating] = useState(false);
  const [options, setOptions] = useState<{ premade: Companion[]; custom: Companion[] }>({ premade: [], custom: [] });
  const [tab, setTab] = useState("female");
  const [limit, setLimit] = useState(20);

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

  const list = useMemo(
    () => (tab === "custom" ? options.custom : options.premade.filter((c) => c.archetype === tab)),
    [tab, options],
  );
  useEffect(() => {
    setLimit(20);
  }, [tab]);
  const visible = list.slice(0, limit);
  const hasMore = limit < list.length;

  const stepKey = { 2: "tone", 3: "location", 4: "scene" }[step as 2 | 3 | 4];
  const canNext = step === 2 ? !!tone : step === 3 ? !!locationId : step === 4 ? scene.trim().length > 0 : false;
  const toneObj = ROLEPLAY_TONES.find((x) => x.id === tone);
  const locObj = ROLEPLAY_LOCATIONS.find((x) => x.id === locationId);

  async function create() {
    if (!companion || !locationId || !tone || !scene.trim() || creating) return;
    setCreating(true);
    try {
      const r = await fetch("/api/roleplay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companionId: companion.id, locationId, tone, sceneOpening: scene.trim() }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || j.error || r.statusText);
      router.push(`/roleplay/${j.sessionId}`);
    } catch (e) {
      setCreating(false);
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  if (step === 1) {
    return (
      <div className="min-h-screen">
        <div>
          <main className="container mx-auto px-4 md:px-6 pt-3 pb-32 max-w-7xl">
            <div className="mb-6">
              <StepIndicator current={1} total={4} />
              <div className="text-center mt-2">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">{t("steps.companion.title")}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t("steps.companion.subtitle")}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {[
                { key: "female", label: g("filterGirls", { default: "Women" }) },
                { key: "anime", label: g("filterAnime", { default: "Anime" }) },
                { key: "male", label: g("filterGuys", { default: "Men" }) },
                { key: "custom", label: g("filterMyAI", { default: "My AI" }) },
              ].map((x) => (
                <button
                  key={x.key}
                  onClick={() => setTab(x.key)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                    tab === x.key
                      ? "border-primary text-primary bg-primary/10"
                      : "border-transparent glass-flat text-muted-foreground hover:text-foreground",
                  )}
                >
                  {x.label}
                </button>
              ))}
            </div>
            {tab === "custom" && options.custom.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-16">{t("emptyTitle")}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {visible.map((c, i) => (
                    <CharacterCard
                      key={c.id}
                      companion={c as never}
                      onClick={() => {
                        setCompanion({ id: c.id, name: c.name, imageUrl: c.imageUrl ?? null });
                        setStep(2);
                      }}
                      shouldPreload={i < 8}
                      priority={i < 4}
                      hideMeta
                    />
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center pt-6">
                    <Button variant="outline" onClick={() => setLimit((n) => n + 20)}>
                      {g("loadMore", { default: "More" })}
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div>
        <StepIndicator current={step} total={4} />
        <main className="container max-w-3xl mx-auto px-4 md:px-6 pt-3 pb-32">
          <CreateStepTitleRow
            title={t(`steps.${stepKey}.title`)}
            canGoBack
            onBack={() => setStep((s) => Math.max(1, s - 1))}
          />
          <p className="text-sm text-muted-foreground text-center mb-6">{t(`steps.${stepKey}.subtitle`)}</p>
          {step === 2 && (
            <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto">
              {ROLEPLAY_TONES.map((x) => (
                <OptionCard
                  key={x.id}
                  emoji={x.emoji}
                  title={t(x.titleKey)}
                  description={t(x.descKey)}
                  isSelected={tone === x.id}
                  onClick={() => setTone(x.id)}
                />
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {ROLEPLAY_LOCATIONS.map((x) => (
                <OptionCard
                  key={x.id}
                  emoji={x.emoji}
                  title={t(x.labelKey)}
                  isSelected={locationId === x.id}
                  onClick={() => setLocationId(x.id)}
                />
              ))}
            </div>
          )}
          {step === 4 && (
            <div className="max-w-xl mx-auto">
              <div className="mb-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">{t("reviewTitle")}</p>
                <div className="grid grid-cols-3 gap-2">
                  <ReviewChip label={t("characterLabel")} value={companion?.name ?? ""} imageUrl={companion?.imageUrl ?? null} onEdit={() => setStep(1)} />
                  <ReviewChip label={t("toneLabel")} value={toneObj ? t(toneObj.titleKey) : ""} emoji={toneObj?.emoji} onEdit={() => setStep(2)} />
                  <ReviewChip label={t("locationLabel")} value={locObj ? t(locObj.labelKey) : ""} emoji={locObj?.emoji} onEdit={() => setStep(3)} />
                </div>
              </div>
              <label className="block text-sm font-medium text-foreground mb-2">{t("sceneLabel")}</label>
              <div className="relative">
                <Textarea
                  value={scene}
                  onChange={(e) => setScene(e.target.value.slice(0, ROLEPLAY_SCENE_MAX))}
                  placeholder={t("scenePlaceholder")}
                  rows={5}
                  maxLength={ROLEPLAY_SCENE_MAX}
                  className="resize-none pb-12"
                />
                <button
                  type="button"
                  onClick={() => {
                    const idea = SCENE_IDEAS[Math.floor(Math.random() * SCENE_IDEAS.length)];
                    setScene(t(`sceneIdeas.${idea.id}`, { default: idea.text }));
                  }}
                  title={t("randomize")}
                  aria-label={t("randomize")}
                  className="absolute bottom-3 right-3 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary p-2 transition-colors"
                >
                  <Dices className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1.5 flex justify-end">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {scene.length}/{ROLEPLAY_SCENE_MAX}
                </span>
              </div>
              <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-semibold text-foreground mb-2">{t("sceneGuidanceTitle")}</p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary" aria-hidden>•</span>
                    {t("sceneGuide1")}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary" aria-hidden>•</span>
                    {t("sceneGuide2")}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary" aria-hidden>•</span>
                    {t("sceneGuide3")}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>
      <div className="fixed bottom-0 inset-x-0 z-40 lg:pl-64">
        <div className="border-t border-border/50 bg-background/30 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 flex items-center justify-center">
            {step < 4 ? (
              <Button
                onClick={() => canNext && setStep((s) => s + 1)}
                disabled={!canNext}
                className="gradient-cta font-semibold h-12 px-10 text-base"
              >
                {t("next", { default: "Next" })}
              </Button>
            ) : (
              <Button
                onClick={create}
                disabled={!canNext || creating}
                className="gradient-cta font-semibold h-12 px-10 text-base gap-2 min-w-[180px]"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t("creating")}
                  </>
                ) : (
                  <span className="flex items-center gap-1.5">
                    {t("create")}
                    <CoinIcon size={14} />1
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* /roleplay/[id] — session room with source chat-room primitives */
type RpMessage = { id: string; role: string; content: string; createdAt?: string };

export function RoleplayRoomById({ id }: { id: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [msgs, setMsgs] = useState<RpMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const [s] = await fetch(`/sb/rest/v1/roleplay_sessions?id=eq.${encodeURIComponent(id)}&limit=1`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);
      if (!live) return;
      setSession(s || null);
      if (s) {
        const [rows, comp] = await Promise.all([
          fetch(
            `/sb/rest/v1/roleplay_session_messages?roleplaySessionId=eq.${encodeURIComponent(id)}&order=createdAt.asc&limit=500`,
          )
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
          fetch(`/sb/rest/v1/companions?id=eq.${encodeURIComponent(String(s.companionId || ""))}&limit=1`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
        ]);
        if (live) {
          setMsgs(rows);
          const c = comp[0];
          if (c) setSession({ ...s, companionName: c.name, companionImageUrl: c.imageUrl });
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setMsgs((m) => [...m, { id: "tmp-" + Date.now(), role: "user", content: text }]);
    try {
      const r = await fetch("/api/roleplay/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, text }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || j.error || r.statusText);
      setMsgs((m) => [...m, { id: "r-" + Date.now(), role: "assistant", content: j.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (session === undefined) {
    return <div className="glass-effect mx-auto my-6 h-64 max-w-3xl animate-pulse rounded-2xl" />;
  }
  if (session === null) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">会话不存在</p>
        <button onClick={() => router.push("/roleplay")} className="gradient-cta mt-4 h-10 rounded-full px-6 text-sm font-bold text-white">
          返回角色扮演
        </button>
      </main>
    );
  }

  const compName = (session.companionName as string) || "角色";
  const compImg = (session.companionImageUrl as string) || null;
  const opening = (session.sceneOpening as string) || "";

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => router.push("/roleplay")} className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="size-8 flex-shrink-0 overflow-hidden rounded-full">
          <AvatarImg src={compImg} name={compName} className="h-full w-full object-cover" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{compName}</h2>
          <p className="truncate text-[11px] text-muted-foreground">{opening.slice(0, 60)}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-6 pl-4 pr-4 md:px-6">
        <div ref={scrollRef} className="sw-scroll min-h-0 flex-1 space-y-4 overflow-y-auto">
          {msgs.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="mb-1 flex flex-col items-end">
                <div className="glass-bubble-pink text-foreground rounded-2xl px-3 md:px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap w-fit max-w-full">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="mb-4 flex">
                <div className="flex flex-col gap-1 max-w-[85%] md:max-w-[70%] min-w-0">
                  <div className="glass-bubble text-foreground rounded-2xl px-3 md:px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap mb-1 w-fit max-w-full">
                    {m.content}
                  </div>
                </div>
              </div>
            ),
          )}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block size-2 animate-pulse rounded-full bg-primary" />
              思考中…
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="glass-effect rounded-full flex items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
            <div className="relative flex-1 min-w-0">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="继续剧情…"
                className="block w-full bg-transparent border-0 outline-none text-foreground resize-none py-3 min-h-[44px] max-h-[120px]"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || busy}
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
    </div>
  );
}
