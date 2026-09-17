"use client";

// Footer: five link columns (gated
// links open the auth modal when signed out), social icons, payment badges,
// company block and copyright row, verbatim structure and copy keys.
import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ShimmerImage } from "@/components/shimmer-image";
import { Separator } from "@/components/ui/separator";
import { openCookieSettings } from "@/lib/cookie-settings";
import { useAuthState } from "@/components/auth/auth-state";
import { useAuthModal } from "@/components/auth/auth-modal-context";

function CookieSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("footer");
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className={`text-left bg-transparent border-0 p-0 ${className ?? ""}`}
    >
      {t("cookieSettings")}
    </button>
  );
}

function GatedLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  const { user } = useAuthState();
  const { openAuthModal } = useAuthModal();
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={(e) => {
        if (!user) {
          e.preventDefault();
          openAuthModal(href);
        }
      }}
      className={className}
    >
      {label}
    </Link>
  );
}

const PAYMENTS = [
  { src: "/resources/payments/visa-classic-svgrepo-com.svg", alt: "Visa", className: "h-7 w-auto" },
  { src: "/resources/payments/mastercard-full-svgrepo-com.svg", alt: "Mastercard", className: "h-7 w-auto" },
  { src: "/resources/payments/bitcoin.svg", alt: "Bitcoin", className: "h-5 w-auto" },
  { src: "/resources/payments/ethereum.svg", alt: "Ethereum", className: "h-5 w-auto" },
  { src: "/resources/payments/litecoin.svg", alt: "Litecoin", className: "h-5 w-auto" },
];

export function Footer() {
  const t = useTranslations("footer");
  const tb = useTranslations("breadcrumbs");

  const columns = {
    product: [
      { label: t("chats"), href: "/chats", gated: true },
      { label: t("aiGroupChat"), href: "/groupchat", gated: true },
      { label: t("aiRoleplay"), href: "/roleplay", gated: true },
      { label: t("createCharacter"), href: "/create" },
      { label: t("generateImage"), href: "/generate-image", gated: true },
      { label: t("generateVideo"), href: "/generate-video", gated: true },
      { label: t("myAI"), href: "/my-ai", gated: true },
      { label: t("collection"), href: "/collection", gated: true },
      { label: t("api"), href: "/api" },
    ],
    features: [
      { label: t("allFeatures"), href: "/features" },
      { label: t("aiGroupChat"), href: "/ai-group-chat" },
      { label: t("aiMemory"), href: "/ai-memory" },
      { label: t("aiRoleplay"), href: "/ai-roleplay" },
      { label: t("aiGirlfriend"), href: "/ai-girlfriend" },
      { label: t("aiBoyfriend"), href: "/ai-boyfriend" },
      { label: t("aiCompanions"), href: "/ai-companions" },
      { label: t("aiFriend"), href: "/ai-friend" },
      { label: t("aiBreakupSupport"), href: "/ai-breakup-support" },
      { label: t("aiParent"), href: "/ai-parent" },
    ],
    company: [
      { label: t("partnerships"), href: "/partnerships" },
      { label: t("pressMedia"), href: "/press" },
      { label: t("careers"), href: "/careers" },
      { label: t("aiRealClones"), href: "/ai-real-clones" },
      { label: t("about"), href: "/about" },
    ],
    resources: [
      { label: t("blog"), href: "/blog" },
      { label: t("news"), href: "/news" },
      { label: t("productUpdates"), href: "/product-updates" },
      { label: t("help"), href: "/help" },
      { label: t("sitemap"), href: "/sitemap" },
    ],
    legal: [
      { label: t("privacyPolicy"), href: "/legal/privacy-policy" },
      { label: t("termsAndConditions"), href: "/legal/terms-and-conditions" },
      { label: t("cookiePolicy"), href: "/legal/cookie-policy" },
      { label: t("other"), href: "/legal" },
    ],
  };

  const linkCls = "text-sm text-muted-foreground hover:text-primary transition-colors";

  return (
    <footer className="glass-structural border-t border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-8 lg:gap-10">
            <div>
              <Link href="/" prefetch={false} className="flex items-center mb-4">
                <ShimmerImage
                  src="/sweetwine-logo-light.svg"
                  alt="SweetWine"
                  width={148}
                  height={32}
                  disableShimmer
                  className="h-auto"
                />
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-[320px]">
                {t("description")}
              </p>
              <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                <p className="font-bold text-primary text-sm">{t("companyName")}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 md:gap-10">
              <div>
                <h3 className="font-semibold mb-4 text-foreground">{t("product")}</h3>
                <ul className="space-y-3">
                  {columns.product.map((l) => (
                    <li key={l.href}>
                      {l.gated ? (
                        <GatedLink href={l.href} label={l.label} className={linkCls} />
                      ) : (
                        <Link href={l.href} prefetch={false} className={linkCls}>
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4 text-foreground">{t("features")}</h3>
                <ul className="space-y-3">
                  {columns.features.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} prefetch={false} className={linkCls}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4 text-foreground">{t("company")}</h3>
                <ul className="space-y-3">
                  {columns.company.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} prefetch={false} className={linkCls}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4 text-foreground">{t("resources")}</h3>
                <ul className="space-y-3">
                  {columns.resources.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} prefetch={false} className={linkCls}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4 text-foreground">{t("legal")}</h3>
                <ul className="space-y-3">
                  {columns.legal.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} prefetch={false} className={linkCls}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <CookieSettingsButton className={`${linkCls} cursor-pointer`} />
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <Separator />
        <div className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <p className="text-sm text-muted-foreground text-center" suppressHydrationWarning>
              {t("copyright", { year: new Date().getFullYear() })}
            </p>
            <div className="flex items-center gap-2">
              {PAYMENTS.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.src} alt={p.alt} className={p.className} loading="lazy" decoding="async" key={p.alt} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
