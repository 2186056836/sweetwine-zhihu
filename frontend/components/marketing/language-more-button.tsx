"use client";

// The "更多" chip in the landing languages wall — opens the restored
// LanguageModal provides the full locale picker.
import { useState } from "react";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { toast } from "sonner";
import { LanguageModal } from "@/components/language-modal";

export function LanguageMoreButton({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-card flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium uppercase tracking-widest text-foreground transition-colors hover:border-border-strong"
      >
        <Globe className="lucide-globe h-5 w-5 shrink-0 text-muted-foreground" />
        {label}
      </button>
      <LanguageModal
        open={open}
        onOpenChange={setOpen}
        value={locale}
        onSelect={(next) => {
          router.replace(pathname, { locale: next });
          toast.success(t("settings.languageUpdated"));
        }}
        title={t("language.selectTitle")}
      />
    </>
  );
}
