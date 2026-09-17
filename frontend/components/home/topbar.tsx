"use client";

// TopBar: fixed glass topbar with
// mobile menu, archetype tabs (desktop) / archetype dropdown (mobile) on
// home & discover, TokenMenu + UserMenu on the right. Hidden on chat /
// group room / roleplay room routes (those own their headers).
import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Menu, ChevronDown, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArchetypeIcon } from "@/components/marketing/archetype-icon";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

const CATEGORIES = [
  { id: "female", labelKey: "navigation.categories.girls" },
  { id: "anime", labelKey: "navigation.categories.anime" },
  { id: "male", labelKey: "navigation.categories.guys" },
] as const;

const DEFAULT_ARCHETYPE = "female";

function setArchetypeParam(current: URLSearchParams, id: string): string {
  const params = new URLSearchParams(current.toString());
  if (id === DEFAULT_ARCHETYPE) {
    params.delete("archetype");
  } else {
    params.set("archetype", id);
  }
  params.delete("page");
  return params.toString();
}

function ArchetypeTabs() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = React.useTransition();
  const active = params.get("archetype") ?? DEFAULT_ARCHETYPE;

  return (
    <nav className="flex items-center gap-1" aria-label="Companion category">
      {CATEGORIES.map((c) => {
        const selected = active === c.id;
        return (
          <button
            key={c.id}
            type="button"
            aria-current={selected ? "page" : undefined}
            onClick={() => {
              const qs = setArchetypeParam(params, c.id);
              const target = qs ? `${pathname}?${qs}` : pathname;
              startTransition(() => {
                router.replace(target, { scroll: false });
              });
            }}
            className={cn(
              "relative px-3 md:px-4 py-2 text-sm font-medium transition-colors min-h-[44px] flex items-center",
              selected ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <ArchetypeIcon archetype={c.id} size={16} className="hidden sm:block" />
              <span className="text-xs sm:text-sm">{t(c.labelKey)}</span>
            </span>
            {selected && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        );
      })}
    </nav>
  );
}

function ArchetypeDropdown() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = React.useTransition();
  const active = params.get("archetype") ?? DEFAULT_ARCHETYPE;
  const current = CATEGORIES.find((c) => c.id === active) ?? CATEGORIES[0];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-1 px-2 hover:bg-transparent hover:text-foreground cursor-pointer"
          aria-label={t(current.labelKey)}
        >
          <ArchetypeIcon archetype={current.id} size={18} />
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[10rem]">
        {CATEGORIES.map((c) => {
          const selected = active === c.id;
          return (
            <DropdownMenuItem
              key={c.id}
              onSelect={() => {
                const qs = setArchetypeParam(params, c.id);
                const target = qs ? `${pathname}?${qs}` : pathname;
                startTransition(() => {
                  router.replace(target, { scroll: false });
                });
              }}
              className={cn("gap-2 cursor-pointer items-center", selected && "text-primary font-medium")}
            >
              <ArchetypeIcon archetype={c.id} size={16} />
              <span>{t(c.labelKey)}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopBar({
  user,
  isPremium = false,
  tokensRemaining,
  onOpenSidebar,
}: {
  user: { nickname?: string | null; email?: string | null } | null;
  isPremium?: boolean;
  tokensRemaining: number | null;
  onOpenSidebar: () => void;
}) {
  const pathname = usePathname();
  const isChatRoom = pathname.includes("/chat/");
  if (isChatRoom || /\/groupchat\/[^/]+/.test(pathname) || /\/roleplay\/[^/]+/.test(pathname)) {
    return null;
  }
  const showTabs = pathname === "/" || pathname === "/discover";

  return (
    <header className="glass-topbar fixed top-[var(--pwa-banner-h,0px)] right-0 left-0 lg:left-64 z-40 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_6px_24px_-16px_rgba(0,0,0,0.4)] pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {isChatRoom && (
            <div className="flex items-center gap-2">
              <button
                className="glass-effect flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                aria-label="chat settings"
                onClick={() => toast("功能待开发！")}
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
          )}
          {showTabs && (
            <React.Suspense fallback={null}>
              <div className="md:hidden">
                <ArchetypeDropdown />
              </div>
              <div className="hidden md:block">
                <ArchetypeTabs />
              </div>
            </React.Suspense>
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
