"use client";

// Character grid (grid + card
// filter panel) — character grid with promo slot injection + 4-select filter
// panel driving URL query params + infinite scroll sentinel.
import * as React from "react";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CharacterCard, type HomeCompanion } from "./character-card";

export type PromoSlot = { position: number; key: string; node: React.ReactNode };

export function CharacterGrid({
  companions,
  onCharacterClick,
  promoSlots,
}: {
  companions: HomeCompanion[];
  onCharacterClick?: (c: HomeCompanion) => void;
  promoSlots?: PromoSlot[];
}) {
  const [cols, setCols] = React.useState(8);
  React.useEffect(() => {
    setCols("ontouchstart" in window || navigator.maxTouchPoints > 0 ? 4 : 8);
  }, []);

  const cards = companions.map((c, i) => (
    <CharacterCard
      key={c.id}
      companion={c}
      onClick={() => onCharacterClick?.(c)}
      shouldPreload={i < cols}
      priority={i < 4}
    />
  ));

  if (promoSlots?.length) {
    for (const slot of [...promoSlots].sort((a, b) => a.position - b.position)) {
      const at = Math.min(Math.max(slot.position - 1, 0), cards.length);
      cards.splice(at, 0, <div key={slot.key}>{slot.node}</div>);
    }
  }

  return <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">{cards}</div>;
}

const ETHNICITIES = [
  ["all", "characters.all"],
  ["caucasian", "characters.ethnicities.caucasian"],
  ["asian", "characters.ethnicities.asian"],
  ["middle-eastern", "characters.ethnicities.middleEastern"],
  ["hispanic", "characters.ethnicities.hispanic"],
  ["african", "characters.ethnicities.african"],
  ["south-asian", "characters.ethnicities.southAsian"],
  ["native-american", "characters.ethnicities.nativeAmerican"],
  ["pacific-islander", "characters.ethnicities.pacificIslander"],
  ["mixed", "characters.ethnicities.mixed"],
  ["other", "characters.ethnicities.other"],
] as const;

const BODY_TYPES = [
  ["all", "characters.all"],
  ["slim", "characters.bodyTypes.slim"],
  ["athletic", "characters.bodyTypes.athletic"],
  ["curvy", "characters.bodyTypes.curvy"],
  ["average", "characters.bodyTypes.average"],
  ["plus-size", "characters.bodyTypes.plus"],
] as const;

const AGE_RANGES = [
  ["all", null],
  ["18-25", "18-25"],
  ["26-35", "26-35"],
  ["36-45", "36-45"],
  ["46+", "46+"],
] as const;

const RELATIONSHIPS = [
  ["all", "characters.all"],
  ["single", "characters.relationships.single"],
  ["dating", "characters.relationships.dating"],
  ["married", "characters.relationships.married"],
  ["none", "characters.relationships.none"],
] as const;

function FunnelIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />
    </svg>
  );
}

export function CharacterFilters({
  ethnicity,
  body,
  age,
  relationship,
  onEthnicityChange,
  onBodyChange,
  onAgeChange,
  onRelationshipChange,
}: {
  ethnicity: string;
  body: string;
  age: string;
  relationship: string;
  onEthnicityChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onAgeChange: (v: string) => void;
  onRelationshipChange: (v: string) => void;
}) {
  const t = useTranslations();
  return (
    <div className="p-4 glass-card rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <FunnelIcon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">{t("characters.filters")}</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("characters.ethnicity")}
          </label>
          <Select value={ethnicity} onValueChange={onEthnicityChange}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t("characters.all")} />
            </SelectTrigger>
            <SelectContent>
              {ETHNICITIES.map(([value, key]) => (
                <SelectItem value={value} key={value}>
                  {key ? t(key) : t("characters.all")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("characters.bodyType")}
          </label>
          <Select value={body} onValueChange={onBodyChange}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t("characters.all")} />
            </SelectTrigger>
            <SelectContent>
              {BODY_TYPES.map(([value, key]) => (
                <SelectItem value={value} key={value}>
                  {key ? t(key) : t("characters.all")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("characters.ageRange")}
          </label>
          <Select value={age} onValueChange={onAgeChange}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t("characters.all")} />
            </SelectTrigger>
            <SelectContent>
              {AGE_RANGES.map(([value, label]) => (
                <SelectItem value={value} key={value}>
                  {label ?? t("characters.all")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("characters.relationship")}
          </label>
          <Select value={relationship} onValueChange={onRelationshipChange}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t("characters.all")} />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map(([value, key]) => (
                <SelectItem value={value} key={value}>
                  {key ? t(key) : t("characters.all")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
