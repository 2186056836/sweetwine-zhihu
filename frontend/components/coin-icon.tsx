// Source-faithful token coin icon: the live site renders a PNG coin from its
// public storage (web-resources/tokens/coin-optimized.png) via next/image,
// not a lucide glyph. Bundled locally under /media.
export function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/media/web-resources/tokens/coin-optimized.png"
      alt=""
      width={size}
      height={size}
      className="shrink-0 select-none"
      draggable={false}
    />
  );
}

/** Source wire format for token amounts (trims float noise). */
export function formatTokens(v: number | null | undefined): string {
  const n = Number(v);
  return Number.isFinite(n) ? Number(n.toFixed(2)).toString() : "0";
}
