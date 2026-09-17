// Archetype icon set and
// its img/mask renderer.
import { cn } from "@/lib/utils";

export const ARCHETYPE_ICONS: Record<string, string> = {
  female: "/resources/icons/female.svg",
  male: "/resources/icons/male.svg",
  anime: "/resources/icons/japan.svg",
};

export function ArchetypeIcon({
  archetype,
  size = 16,
  className,
  monochrome,
}: {
  archetype: string;
  size?: number;
  className?: string;
  monochrome?: boolean;
}) {
  const src = ARCHETYPE_ICONS[archetype];
  if (!src) return null;
  if (monochrome) {
    return (
      <span
        aria-hidden
        style={{
          width: size,
          height: size,
          maskImage: `url(${src})`,
          WebkitMaskImage: `url(${src})`,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskSize: "contain",
          WebkitMaskSize: "contain",
        }}
        className={cn("inline-block shrink-0 bg-current", className)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={cn("block shrink-0 object-contain", className)}
    />
  );
}
