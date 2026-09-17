"use client";

// MarketingNav: fixed glass-card top
// bar with logo, compact LanguageSwitcher and auth-modal CTA buttons.
import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ShimmerImage } from "@/components/shimmer-image";
import { LanguageSwitcher } from "./language-switcher";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useAuthState } from "@/components/auth/auth-state";
import { UserMenu } from "@/components/home/user-menu";

export function MarketingNav() {
  const { openAuthModal } = useAuthModal();
  const { user } = useAuthState();
  const t = useTranslations("landing.nav");

  return (
    <nav className="fixed top-[var(--pwa-banner-h,0px)] left-0 right-0 z-50 glass-card border-b-0 pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          prefetch={false}
          className="flex items-center hover:opacity-80 transition-opacity duration-200"
        >
          <ShimmerImage
            src="/sweetwine-logo-light.svg"
            alt="SweetWine"
            width={148}
            height={32}
            priority
            disableShimmer
            className="block h-6 w-auto sm:h-8"
          />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher compact />
          {user ? (
            <>
              <UserMenu user={user} />
            </>
          ) : (
            <>
            <button
            onClick={() => openAuthModal()}
            aria-label="Get started"
            className="w-9 h-9 rounded-full gradient-cta neon-glow-primary hidden sm:flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-white"
            >
              <circle cx="12" cy="9" r="5" />
              <line x1="12" y1="14" x2="12" y2="21" />
              <line x1="9" y1="18" x2="15" y2="18" />
            </svg>
          </button>
          <button
            onClick={() => openAuthModal()}
            className="gradient-cta neon-glow-primary px-6 py-2.5 text-white font-semibold rounded-full text-sm hover:opacity-90 transition-opacity duration-200 whitespace-nowrap shrink-0"
          >
            {t("getStarted")}
            </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
