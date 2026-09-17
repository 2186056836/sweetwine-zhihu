"use client";

// CharacterCard: hover/touch video
// preview with group-synced playback, NEW badge, first-name + age + bio
// overlay, optional delete button.
import * as React from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { ShimmerImage } from "@/components/shimmer-image";
import { Badge } from "@/components/ui/badge-card";
import { Card } from "@/components/ui/badge-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HomeCompanion = {
  id: string;
  slug: string;
  name: string;
  age: number | null;
  bio: string | null;
  imageUrl: string;
  videoUrl: string | null;
  isNew?: boolean | number | null;
};

const hoverGroup = new Set<(id: string) => void>();
let hoveredId: string | null = null;

function getFirstName(name: string): string {
  return name.split(" ")[0] || name;
}

export function CharacterCard({
  companion,
  onClick,
  className,
  shouldPreload = false,
  showDelete = false,
  onDelete,
  priority = false,
  hideMeta = false,
  selected = false,
}: {
  companion: HomeCompanion;
  onClick?: () => void;
  className?: string;
  shouldPreload?: boolean;
  showDelete?: boolean;
  onDelete?: () => void;
  priority?: boolean;
  hideMeta?: boolean;
  selected?: boolean;
}) {
  const t = useTranslations();
  const [hovered, setHovered] = React.useState(false);
  const [videoFailed, setVideoFailed] = React.useState(false);
  const [touchMode, setTouchMode] = React.useState(false);
  const [groupActive, setGroupActive] = React.useState(false);
  const [videoLoaded, setVideoLoaded] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const cardRef = React.useRef<HTMLDivElement | null>(null);

  const setRef = React.useCallback((el: HTMLVideoElement | null) => {
    if (el) {
      el.muted = true;
      el.defaultMuted = true;
    }
    videoRef.current = el;
  }, []);

  React.useEffect(() => {
    setTouchMode("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (hoveredId === companion.id) setGroupActive(true);
  }, [companion.id]);

  React.useEffect(() => {
    if (!touchMode) return;
    const handler = (id: string) => setGroupActive(id === companion.id);
    hoverGroup.add(handler);
    return () => {
      hoverGroup.delete(handler);
    };
  }, [touchMode, companion.id]);

  const onTouchStart = React.useCallback(() => {
    if (touchMode && companion.videoUrl && !videoFailed) {
      hoveredId = companion.id;
      hoverGroup.forEach((fn) => fn(companion.id));
    }
  }, [touchMode, companion.videoUrl, videoFailed, companion.id]);

  const active = touchMode ? groupActive : hovered;

  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (active) {
      el.play().catch(() => {
        setTimeout(() => {
          el.play().catch(() => {});
        }, 100);
      });
    } else {
      el.pause();
    }
  }, [active]);

  return (
    <Card
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={onTouchStart}
      className={cn(
        "group glass-flat relative overflow-hidden cursor-pointer transition-[transform,box-shadow] duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20",
        selected && "outline-2 outline-offset-0 outline-primary",
        className,
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <ShimmerImage
          src={companion.imageUrl}
          alt={companion.name}
          fill
          priority={priority}
          className="object-cover transition-transform duration-300 group-hover:scale-110 group-hover:brightness-110"
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
        />
        {companion.videoUrl && !videoFailed && (
          <video
            ref={setRef}
            src={groupActive || hovered ? companion.videoUrl : undefined}
            muted
            loop
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-10",
              active && videoLoaded ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
            onLoadedData={() => setVideoLoaded(true)}
            onError={(e) => {
              const err = (e.currentTarget as HTMLVideoElement).error;
              if (err && err.code !== 1) setVideoFailed(true);
            }}
            key={`${companion.id}-video`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20" />
        {showDelete && onDelete && (
          <div className="absolute top-2 right-2 z-40">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        {companion.isNew && !hideMeta && (
          <div className="absolute top-3 right-3 z-30">
            <Badge className="bg-primary text-white border-none shadow-lg">
              <span className="inline-flex h-[1lh] items-center">
                <span className="leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                  + {t("characters.newBadge")}
                </span>
              </span>
            </Badge>
          </div>
        )}
        {hideMeta ? (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30">
            <span
              className={cn(
                "px-3 py-1 rounded-full text-sm font-semibold shadow-lg transition-colors",
                selected ? "bg-primary text-white" : "bg-black/60 text-white",
              )}
            >
              {getFirstName(companion.name)}
            </span>
          </div>
        ) : (
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-30">
            <h3 className="text-xl font-semibold mb-1">
              {getFirstName(companion.name)}{" "}
              <span className="text-base font-normal text-muted-foreground">{companion.age}</span>
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-snug">{companion.bio}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
