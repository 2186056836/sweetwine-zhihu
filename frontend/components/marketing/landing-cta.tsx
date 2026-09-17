"use client";

// landing CTAs: all open
// the auth modal when signed out, navigate when signed in.
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/components/auth/auth-modal-context";

export function CreateYourAIButton() {
  const { openAuthModal } = useAuthModal();
  const t = useTranslations("landing.createAI");
  return (
    <button
      onClick={() => openAuthModal()}
      className="gradient-cta neon-glow-primary inline-flex items-center gap-2 px-10 py-4 text-white font-bold rounded-full hover:opacity-90 transition-opacity duration-200 text-base"
    >
      <Sparkles className="w-4 h-4" />
      {t("cta")}
    </button>
  );
}

export function LandingCTAButtons({ justify = "justify-center" }: { justify?: string } = {}) {
  const { openAuthModal } = useAuthModal();
  const t = useTranslations("landing.hero");
  return (
    <div className={`flex ${justify}`}>
      <button
        onClick={() => openAuthModal()}
        className="gradient-cta neon-glow-primary px-12 py-4 text-white font-bold rounded-full hover:opacity-90 transition-opacity duration-200 text-lg"
      >
        {t("cta")}
      </button>
    </div>
  );
}

export function MarketingCTAButton({
  label,
  isAuthenticated = false,
  redirectTo = "/",
}: {
  label: string;
  isAuthenticated?: boolean;
  redirectTo?: string;
}) {
  const { openAuthModal } = useAuthModal();
  const router = useRouter();
  return (
    <Button
      size="lg"
      variant="cta"
      onClick={() => {
        if (isAuthenticated) {
          router.push(redirectTo);
        } else {
          openAuthModal(redirectTo);
        }
      }}
    >
      {label}
    </Button>
  );
}
