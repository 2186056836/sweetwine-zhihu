"use client";

// LanguageModal: searchable,
// region-grouped locale grid over READY_LOCALES, verbatim structure/classes.
import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Globe, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShimmerImage } from "@/components/shimmer-image";
import { cn } from "@/lib/utils";
import { LOCALE_CONFIG, READY_LOCALES, REGION_ORDER } from "@/lib/locale-config";

function FlagOrGlobe({
  src,
  alt,
  size = 22,
  className,
}: {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  if (!src || failed) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-inset text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <Globe className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <ShimmerImage
      src={src}
      width={size}
      height={size}
      alt={alt}
      unoptimized
      disableShimmer
      onError={() => setFailed(true)}
      className={cn("block shrink-0 rounded-full", className)}
    />
  );
}

export function LanguageModal({
  open,
  onOpenChange,
  value,
  onSelect,
  title,
  description,
  disabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onSelect: (locale: string) => void;
  title: string;
  description?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("language");
  const [query, setQuery] = React.useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQuery("");
    }
    onOpenChange(next);
  };

  const entries = React.useMemo(() => {
    const all = READY_LOCALES.map((code) => [code, LOCALE_CONFIG[code]] as const);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      ([code, { name, nativeName }]) =>
        code.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        nativeName.toLowerCase().includes(q),
    );
  }, [query]);

  const byRegion = React.useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const item of entries) {
      const region = item[1].region;
      const bucket = map.get(region);
      if (bucket) {
        bucket.push(item);
      } else {
        map.set(region, [item]);
      }
    }
    return map;
  }, [entries]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription className={description ? undefined : "sr-only"}>
            {description ?? title}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            autoComplete="off"
            className="w-full rounded-md glass-input py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-text-faint focus:border-primary/50 focus:outline-none focus:ring-[3px] focus:ring-primary/15"
          />
        </div>
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noResults")}</p>
        ) : (
          <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1 sw-scroll">
            {REGION_ORDER.map((region) => {
              const items = byRegion.get(region);
              if (!items || items.length === 0) return null;
              return (
                <div key={region}>
                  <h3 className="mb-2 px-0.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t(`regions.${region}`)}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {items.map(([code, { nativeName, flag }]) => {
                      const selected = value === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            if (!disabled) {
                              onSelect(code);
                              handleOpenChange(false);
                            }
                          }}
                          disabled={disabled}
                          aria-pressed={selected}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-md border glass-flat px-3 py-3 text-left transition-colors",
                            "hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50",
                            selected ? "border-primary ring-1 ring-primary/40" : "border-border",
                          )}
                        >
                          <FlagOrGlobe src={flag} alt={nativeName} />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                            {nativeName}
                          </span>
                          {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
