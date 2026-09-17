// Marketing landing home — sections with copy bound to the landing
// dictionary. Client islands below.
// MarketingNav, CyclingHeadline, CTAs, FAQ,
// Footer 
import { useTranslations } from "next-intl";
import {
  MessageSquare,
  Image as ImageIcon,
  Users,
  Drama,
  Sparkles,
  Clock,
  Infinity as InfinityIcon,
  Shield,
  Brain,
  Film,
  Gift,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Footer } from "@/components/marketing/footer";
import { CyclingHeadline } from "@/components/marketing/cycling-headline";
import { FAQSection } from "@/components/marketing/faq-section";
import {
  CreateYourAIButton,
  LandingCTAButtons,
} from "@/components/marketing/landing-cta";
import { LanguageMoreButton } from "@/components/marketing/language-more-button";
import { LOCALE_CONFIG } from "@/lib/locale-config";

const HERO_VIDEO = "/media/site/sweetwine-hero-video.mp4";
const CREATE_VIDEO = "/media/store-b/web-resources/create-your-ai-webvideo.mp4";
const PLATFORM_SHOT = "/media/store-b/web-resources/platform-screenshot-imagepreview.webp";

const LANG_CHIPS = ["en", "de", "fr", "pt", "it", "pl", "cs", "ja", "sv", "es"];

const MEMORY_SATELLITES = [
  { key: "chat", icon: MessageSquare, left: "50%", top: "14%", delay: "0s" },
  { key: "image", icon: ImageIcon, left: "75.45584412271572%", top: "24.54415587728429%", delay: "0.22s" },
  { key: "video", icon: Film, left: "86%", top: "50%", delay: "0.44s" },
  { key: "gifts", icon: Gift, left: "14%", top: "50.00000000000001%", delay: "1.32s" },
  { key: "roleplay", icon: Drama, left: "24.544155877284282%", top: "24.54415587728429%", delay: "1.54s" },
] as const;

export function AmbientGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute rounded-full"
        style={{ top: "-200px", left: "-160px", width: 760, height: 760, background: "radial-gradient(circle at 30% 25%, rgba(255,110,179,0.42), transparent 68%)", filter: "blur(50px)" }}
      />
      <div
        className="absolute rounded-full"
        style={{ top: 120, left: 420, width: 780, height: 780, background: "radial-gradient(circle at 30% 25%, rgba(255,176,218,0.34), transparent 68%)", filter: "blur(65px)" }}
      />
      <div
        className="absolute rounded-full"
        style={{ bottom: -260, right: -140, width: 720, height: 720, background: "radial-gradient(circle at 30% 25%, rgba(233,78,151,0.36), transparent 68%)", filter: "blur(55px)" }}
      />
    </div>
  );
}

export function LandingHome() {
  const t = useTranslations("landing");

  const features = [
    { href: "/ai-girlfriend", icon: MessageSquare, tint: "primary", title: t("features.chat.title"), desc: t("features.chat.description"), lucide: false },
    { href: "/features", icon: ImageIcon, tint: "tertiary", title: t("features.media.title"), desc: t("features.media.description"), lucide: false },
    { href: "/ai-group-chat", icon: Users, tint: "primary", title: t("features.groupChat.title"), desc: t("features.groupChat.description"), lucide: false },
    { href: "/ai-roleplay", icon: Drama, tint: "primary", title: t("features.roleplay.title"), desc: t("features.roleplay.description"), lucide: true },
  ];

  const why = [
    { icon: Clock, title: t("whySweetWine.benefits.freeToStart.title"), desc: t("whySweetWine.benefits.freeToStart.desc") },
    { icon: Sparkles, title: t("whySweetWine.benefits.alwaysAvailable.title"), desc: t("whySweetWine.benefits.alwaysAvailable.desc") },
    { icon: MessageSquare, title: t("whySweetWine.benefits.remembers.title"), desc: t("whySweetWine.benefits.remembers.desc") },
    { icon: InfinityIcon, title: t("whySweetWine.benefits.unlimited.title"), desc: t("whySweetWine.benefits.unlimited.desc") },
    { icon: Shield, title: t("whySweetWine.benefits.private.title"), desc: t("whySweetWine.benefits.private.desc") },
    { icon: Users, title: t("whySweetWine.benefits.createYourOwn.title"), desc: t("whySweetWine.benefits.createYourOwn.desc") },
  ];

  return (
    <div className="min-h-screen text-foreground">
      <AmbientGlow />
      <MarketingNav />

      {/* hero */}
      <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden pt-topbar">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={HERO_VIDEO}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/50 pointer-events-none" aria-hidden />
        <div className="relative z-10 text-center max-w-4xl px-6">
          <p className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-white/80 mb-6 whitespace-nowrap">
            {t("hero.tagline")}
          </p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6" style={{ fontFamily: "var(--font-rubik)" }}>
            {t("hero.headlinePrefix")}
            <br />
            <CyclingHeadline />
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            {t("hero.subtitle")}
          </p>
          <LandingCTAButtons />
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 animate-bounce">
          <div className="w-[1px] h-10 bg-primary/50" />
        </div>
      </section>

      {/* feature cards */}
      <section className="py-28 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,110,179,0.10) 0%, transparent 65%)" }}
          aria-hidden
        />
        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <Link
                  key={f.href + f.title}
                  href={f.href}
                  className="glass-card p-6 rounded-2xl flex flex-col transition-transform hover:-translate-y-1"
                >
                  <div className={`bg-${f.tint}/10 text-${f.tint} p-2.5 rounded-xl w-fit mb-5`}>
                    <Icon className="w-7 h-7" strokeWidth={f.lucide ? 2 : 1.5} />
                  </div>
                  <h3 className="text-base md:text-lg font-black mb-2 leading-tight" style={{ fontFamily: "var(--font-rubik)" }}>
                    {f.title}
                  </h3>
                  <p className="text-on-surface-variant text-xs md:text-sm leading-relaxed mt-auto">{f.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* create your AI */}
      <section className="py-16 md:py-24 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden min-h-[300px] sm:min-h-[420px] md:min-h-[580px]">
            <div className="absolute inset-0 w-full h-full">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={CREATE_VIDEO} className="h-full w-full object-cover" autoPlay loop muted playsInline preload="metadata" aria-hidden />
            </div>
            <div
              className="absolute inset-0 pointer-events-none md:hidden"
              style={{ background: "linear-gradient(to bottom, rgba(13,13,14,0.35) 0%, rgba(13,13,14,0.75) 55%, rgba(13,13,14,0.97) 100%)" }}
              aria-hidden
            />
            <div
              className="absolute inset-0 pointer-events-none hidden md:block"
              style={{ background: "linear-gradient(to left, rgba(13,13,14,0.92) 0%, rgba(13,13,14,0.75) 50%, transparent 80%)" }}
              aria-hidden
            />
            <div className="relative z-10 flex items-end md:items-center justify-center ltr:md:justify-end rtl:md:justify-start h-full min-h-[300px] sm:min-h-[420px] md:min-h-[580px]">
              <div className="p-6 md:p-14 w-full md:max-w-[580px] text-center md:text-start">
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.08] tracking-tight mb-4" style={{ fontFamily: "var(--font-rubik)" }}>
                  {t("createAI.headlinePrefix")}
                  <br />
                  <span className="text-gradient">{t("createAI.headlineHighlight")}</span>
                </h2>
                <p className="text-white/70 text-base md:text-lg leading-relaxed mb-8 max-w-sm">
                  {t("createAI.subtitle")}
                </p>
                <CreateYourAIButton />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* meet your companions */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight" style={{ fontFamily: "var(--font-rubik)" }}>
                {t("companions.headlinePrefix")}
                <br />
                <span className="text-gradient">{t("companions.headlineHighlight")}</span>
              </h2>
              <p className="text-on-surface-variant text-lg leading-relaxed mb-8 max-w-xl">
                {t("companions.subtitle")}
              </p>
              <div className="flex justify-center md:justify-start">
                <LandingCTAButtons justify="justify-center md:justify-start" />
              </div>
            </div>
            <div className="flex-1 w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="AI characters grid"
                loading="lazy"
                width={680}
                height={480}
                decoding="async"
                className="w-full rounded-2xl object-cover"
                src={PLATFORM_SHOT}
              />
            </div>
          </div>
        </div>
      </section>

      {/* AI memory */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 70% 40%, rgba(255,110,179,0.10) 0%, transparent 55%)" }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-2 md:gap-16 md:px-6">
          <div className="text-center md:order-2 md:text-left">
            <h2 className="mb-4 text-3xl font-black md:text-5xl" style={{ fontFamily: "var(--font-rubik)" }}>
              {t("memory.title")}
            </h2>
            <p className="mb-8 text-base leading-relaxed text-on-surface-variant md:text-lg">
              {t("memory.subtitle")}
            </p>
            <Link href="/ai-memory">
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:bg-inset disabled:text-text-faint disabled:shadow-none gradient-cta text-white neon-glow-primary hover:opacity-90 transition-opacity min-h-12 px-8 text-[15px]">
                {t("memory.cta")}
              </button>
            </Link>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[20rem] sm:max-w-md md:order-1" role="img" aria-label={t("memory.diagram.center")}>
            <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="14" className="fill-none stroke-primary/20" strokeWidth="0.35">
                <animate attributeName="r" values="14;17;14" dur="3.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.12;0.5" dur="3.2s" repeatCount="indefinite" />
              </circle>
            </svg>
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <div className="flex aspect-square shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-full glass-card border border-primary/30 shadow-[0_0_32px_-6px_rgba(255,110,179,0.5)] h-[7.25rem] w-[7.25rem] sm:h-[8.25rem] sm:w-[8.25rem]">
                <div className="animate-memory-float flex flex-col items-center justify-center gap-1">
                  <Brain className="lucide-brain shrink-0 text-primary h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.5} />
                  <span className="px-2 text-center font-bold text-foreground max-w-[5.5rem] text-[9px] sm:text-[10px]" style={{ fontFamily: "var(--font-rubik)" }}>
                    {t("memory.diagram.center")}
                  </span>
                </div>
              </div>
            </div>
            {MEMORY_SATELLITES.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.key} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: s.left, top: s.top }}>
                  <div className="flex flex-col items-center gap-1.5 glass-card border border-border rounded-lg min-w-[3.75rem] px-2 py-2 sm:min-w-[4.5rem] sm:px-2.5 sm:py-2.5">
                    <div className="animate-memory-float flex flex-col items-center gap-1.5" style={{ "--memory-float-delay": s.delay } as React.CSSProperties}>
                      <Icon className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="whitespace-nowrap font-semibold text-foreground text-[9px] sm:text-[10px]">
                        {t(`memory.diagram.${s.key}`)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* languages */}
      <section className="py-24 bg-surface-container-low">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6" style={{ fontFamily: "var(--font-rubik)" }}>
            {t("languages.headlinePrefix")} <span className="text-gradient">{t("languages.headlineHighlight")}</span>
          </h2>
          <p className="text-on-surface-variant text-lg leading-relaxed mb-4 max-w-2xl mx-auto">{t("languages.subtitle")}</p>
          <p className="text-on-surface-variant/70 text-sm mb-10 max-w-xl mx-auto">{t("languages.tagline")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {LANG_CHIPS.map((code) => {
              const def = LOCALE_CONFIG[code];
              if (!def) return null;
              return (
                <span key={code} className="glass-card flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium uppercase tracking-widest text-foreground">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={def.nativeName} loading="lazy" width={20} height={20} decoding="async" className="rounded-full block shrink-0" src={def.flag} />
                  {def.nativeName}
                </span>
              );
            })}
            <LanguageMoreButton label={t("languages.more")} />
          </div>
        </div>
      </section>

      {/* final CTA */}
      <section className="py-32 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{ background: "radial-gradient(ellipse at 50% 50%, #FF6EB3 0%, transparent 70%)" }}
          aria-hidden
        />
        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.0]" style={{ fontFamily: "var(--font-rubik)" }}>
            {t("finalCta.headlinePrefix")} <span className="text-gradient">{t("finalCta.headlineHighlight")}</span>
          </h2>
          <p className="text-on-surface-variant text-lg md:text-xl mb-10 leading-relaxed">{t("finalCta.subtitle")}</p>
          <LandingCTAButtons />
        </div>
      </section>

      <FAQSection />

      {/* why sweetwine */}
      <section className="py-24 bg-surface-container-low relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(255,110,179,0.08) 0%, transparent 65%)" }}
          aria-hidden
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ fontFamily: "var(--font-rubik)" }}>
              {t("whySweetWine.headlinePrefix")} <span className="text-gradient">{t("whySweetWine.headlineHighlight")}</span>
            </h2>
            <p className="text-on-surface-variant text-base max-w-xl mx-auto">{t("whySweetWine.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {why.map((w) => {
              const Icon = w.icon;
              return (
                <div key={w.title} className="glass-card rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-base font-black leading-tight" style={{ fontFamily: "var(--font-rubik)" }}>
                      {w.title}
                    </h3>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{w.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="glass-card rounded-2xl p-8 border-l-4 border-l-primary">
            <h2 className="text-xl font-black mb-1" style={{ fontFamily: "var(--font-rubik)" }}>
              {t("whySweetWine.difference.title")}
            </h2>
            <p className="text-on-surface-variant text-sm mb-6">{t("whySweetWine.difference.description")}</p>
            <div className="border-t border-white/10 pt-6 flex flex-col gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <p className="text-base font-black mb-2" style={{ fontFamily: "var(--font-rubik)" }}>
                  {t("whySweetWine.difference.freedomTitle")}
                </p>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-3">
                  {t("whySweetWine.difference.freedomDescription")}
                </p>
                <p className="text-sm font-bold leading-relaxed">{t("whySweetWine.difference.freedomStatement")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

