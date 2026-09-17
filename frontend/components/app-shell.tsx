"use client";

// App shell: fixed left aside + top bar + mobile drawer state.
// Auth behaviour: pages stay browsable when signed out,
// gated actions open the AuthModal instead of redirecting.
import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { useAuthState } from "@/components/auth/auth-state";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { getProfile, type Profile } from "@/lib/api";
import {
  House,
  Compass,
  ChevronDown,
  MessageCircle,
  Users,
  Drama,
  Sparkles,
  Image as ImageIcon,
  Film,
  GraduationCap,
  Heart,
  Layers,
  Mail,
  Settings,
  X,
} from "lucide-react";
import { TopBar } from "@/components/home/topbar";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { useTranslations, useLocale } from "next-intl";

type NavItem = {
  href: string;
  lk: string;
  icon: React.ComponentType<{ className?: string }>;
  cta?: boolean;
  badge?: string;
};

const GROUPS: { tk: string; items: NavItem[] }[] = [
  {
    tk: "",
    items: [
      { href: "/", lk: "explore", icon: House },
      { href: "/discover", lk: "discover", icon: Compass },
    ],
  },
  {
    tk: "sectionTalk",
    items: [
      { href: "/campus", lk: "campus", icon: GraduationCap },
      { href: "/chats", lk: "chats", icon: MessageCircle },
      { href: "/groupchat", lk: "groupChat", icon: Users },
      { href: "/roleplay", lk: "roleplay", icon: Drama },
    ],
  },
  {
    tk: "sectionCreate",
    items: [
      { href: "/create", lk: "createCharacter", icon: Sparkles },
      { href: "/generate-image", lk: "generateImage", icon: ImageIcon },
      { href: "/generate-video", lk: "generateVideo", icon: Film },
    ],
  },
  {
    tk: "sectionLibrary",
    items: [
      { href: "/my-ai", lk: "myAI", icon: Heart },
      { href: "/collection", lk: "collection", icon: Layers },
    ],
  },
];

const FOOTER_NAV = [
  { href: "/settings/profile", lk: "account", icon: Settings },
];

export function AppShell({
  children,
  user,
  isPremium,
  tokens,
}: {
  children: React.ReactNode;
  user?: { nickname?: string | null; email?: string } | null;
  isPremium?: boolean;
  tokens?: number | null;
}) {
  const pathname = usePathname();
  const tNav = useTranslations("navigation");
  const tFoot = useTranslations("footer");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  // admin console can disable sidebar entries (GET /api/nav-features);
  // undefined = endpoint not ready yet -> treat all as enabled
  const [navFeatures, setNavFeatures] = useState<Record<string, boolean> | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/nav-features")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && setNavFeatures(j && typeof j === "object" ? j : null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const navEnabled = (href: string) => navFeatures === null || navFeatures[href] !== false;
  const visibleGroups = navFeatures === null ? GROUPS : GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => navEnabled(it.href)),
  })).filter((g) => g.items.length > 0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { user: authUser, isLoading } = useAuthState();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    if (user === undefined && authUser) {
      getProfile().then(setProfile);
    } else if (!authUser) {
      setProfile(null);
    }
  }, [authUser, user]);

  const effectiveUser = user !== undefined
    ? user
    : authUser
      ? { nickname: profile?.nickname ?? (authUser.user_metadata?.nickname as string | undefined), email: authUser.email }
      : null;
  const effectiveTokens = tokens !== undefined ? tokens : profile?.tokens ?? null;
  const effectivePremium = isPremium !== undefined ? isPremium : profile?.isPremium ?? false;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const aside = (
    <aside
      className={
        "fixed left-0 top-0 z-[45] w-64 glass-sidebar border-r border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),8px_0_30px_-12px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-in-out h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:translate-x-0 " +
        (open ? "translate-x-0" : "-translate-x-full")
      }
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 flex-shrink-0 items-center justify-between px-6">
          <a className="flex items-center" href={hrefFor("/")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="SweetWine" width={130} height={28} className="h-auto" src="/sweetwine-logo-light.svg" />
          </a>
          <button
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center size-10 rounded-full text-foreground lg:hidden"
            aria-label="close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4 scrollbar-hide">
          {visibleGroups.map((g, gi) => (
            <div className="space-y-1" key={gi}>
              {g.tk && (
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [gi]: !c[gi] }))}
                  className="flex w-full items-center justify-between px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60"
                  aria-expanded={!collapsed[gi]}
                >
                  <span>{tNav(g.tk)}</span>
                  <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (collapsed[gi] ? "-rotate-90" : "")} />
                </button>
              )}
              {!collapsed[gi] &&
                g.items.map((it) => {
                const active = isActive(it.href);
                const Icon = it.icon;
                return (
                  <a
                    key={it.href}
                    href={hrefFor(it.href)}
                    onClick={() => setOpen(false)}
                    className={
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                      (it.cta
                        ? "glass-pink text-foreground hover:opacity-90"
                        : "text-muted-foreground hover: hover:text-foreground")
                    }
                  >
                    <Icon className={"h-5 w-5 " + (it.cta ? "text-primary" : "")} />
                    <span>{tNav(it.lk)}</span>
                    {it.badge && (
                      <span className="pointer-events-none absolute -top-1.5 -right-1.5 gradient-cta rounded-full border-none px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                        {it.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="flex-shrink-0 border-t border-border px-3 py-4">
          <div className="space-y-1">
            <div className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground">
              <LanguageSwitcher />
            </div>
            <button className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
              <Mail className="h-4 w-4" />
              {tNav("contactUs")}
            </button>
            {FOOTER_NAV.map((it) => {
              const Icon = it.icon;
              return (
                <a
                  key={it.href}
                  href={hrefFor(it.href)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                  {tNav(it.lk)}
                </a>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-1.5 px-3 text-[11px] text-muted-foreground">
            <span className="whitespace-nowrap">{tFoot("privacyPolicy")}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="whitespace-nowrap">{tFoot("termsAndConditions")}</span>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-[100dvh] text-foreground">
      <AmbientGlow />
      {aside}
      {open && (
        <div
          className="fixed inset-0 z-[44] bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="flex min-h-[100dvh] flex-col lg:pl-64">
        <TopBar
          user={effectiveUser}
          isPremium={effectivePremium}
          tokensRemaining={effectiveTokens}
          onOpenSidebar={() => setOpen(true)}
        />
        <div className={"flex flex-1 flex-col" + (isRoomRoute(pathname) ? "" : " pt-topbar")}>
          {children}
        </div>
      </div>
    </div>
  );

  function hrefFor(href: string): string {
    return "/" + locale + (href === "/" ? "" : href);
  }
}

// room pages render their own full-height header (TopBar/SaleBar are hidden
// there), so they must not inherit the fixed-topbar offset
function isRoomRoute(pathname: string): boolean {
  return (
    pathname.includes("/chat/") ||
    /\/groupchat\/[^/]+/.test(pathname) ||
    /\/roleplay\/[^/]+/.test(pathname)
  );
}

// Body-level ambient glow: three blurred pink
// radial blobs in a fixed, pointer-transparent, negative-z layer.
function AmbientGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div
        className="absolute rounded-full"
        style={{
          top: "-200px",
          left: "-160px",
          width: "760px",
          height: "760px",
          background: "radial-gradient(circle at 30% 25%, rgba(255,110,179,0.42), transparent 68%)",
          filter: "blur(50px)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: "120px",
          left: "420px",
          width: "780px",
          height: "780px",
          background: "radial-gradient(circle at 30% 25%, rgba(255,176,218,0.34), transparent 68%)",
          filter: "blur(65px)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          bottom: "-260px",
          right: "-140px",
          width: "720px",
          height: "720px",
          background: "radial-gradient(circle at 30% 25%, rgba(233,78,151,0.36), transparent 68%)",
          filter: "blur(55px)",
        }}
      />
    </div>
  );
}
