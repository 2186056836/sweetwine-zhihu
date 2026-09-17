"use client";

// LanguageSwitcher: compact flag
// button or full sidebar row, opens LanguageModal, persists the choice via
// updateUserProfile(preferredLanguage) then swaps the route locale.
import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { toast } from "sonner";
import { ShimmerImage } from "@/components/shimmer-image";
import { LanguageModal } from "@/components/language-modal";
import { LOCALE_CONFIG } from "@/lib/locale-config";
import { updateUserProfile } from "@/lib/actions";

export function LanguageSwitcher({
  userNickname,
  userGender,
  userAiLanguage,
  compact,
}: {
  userNickname?: string;
  userGender?: string;
  userAiLanguage?: string;
  compact?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = React.useTransition();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const def = LOCALE_CONFIG[locale] ?? LOCALE_CONFIG.en;

  if (mounted) {
    return (
      <>
        {compact ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-accent disabled:opacity-50"
            disabled={pending}
            aria-label="Switch language"
          >
            <ShimmerImage
              unoptimized
              disableShimmer
              src={def.flag}
              width={26}
              height={26}
              alt={def.nativeName}
              className="rounded-full block shrink-0"
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            disabled={pending}
          >
            <span className="flex items-center gap-2">
              <ShimmerImage
                unoptimized
                disableShimmer
                src={def.flag}
                width={20}
                height={20}
                alt={def.nativeName}
                className="rounded-full block shrink-0"
              />
              <span>{def.nativeName}</span>
            </span>
          </button>
        )}
        <LanguageModal
          open={open}
          onOpenChange={setOpen}
          value={locale}
          onSelect={(next) => {
            startTransition(async () => {
              if (userNickname && userGender) {
                try {
                  await updateUserProfile({
                    nickname: userNickname,
                    gender: userGender as "male" | "female",
                    aiLanguage: userAiLanguage,
                    preferredLanguage: next,
                  });
                } catch (e) {
                  console.error("Failed to update language preference:", e);
                }
              }
              router.replace(pathname, { locale: next });
              toast.success(t("settings.languageUpdated"));
            });
          }}
          title={t("language.selectTitle")}
          disabled={pending}
        />
      </>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-lg">
        <ShimmerImage
          unoptimized
          disableShimmer
          src={def.flag}
          width={26}
          height={26}
          alt={def.nativeName}
          className="rounded-full block shrink-0"
        />
      </div>
    );
  }
  return (
    <div className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-2">
        <ShimmerImage
          unoptimized
          disableShimmer
          src={def.flag}
          width={20}
          height={20}
          alt={def.nativeName}
          className="rounded-full block shrink-0"
        />
        <span>{def.nativeName}</span>
      </span>
    </div>
  );
}
