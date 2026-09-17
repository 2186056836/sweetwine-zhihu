// Shared avatar with initials fallback: companions created without an upload
// have imageUrl === "" and a bare <img src=""> renders a broken glyph.
export function AvatarImg({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={
          "flex items-center justify-center bg-white/10 font-bold text-foreground " +
          (className || "")
        }
        aria-label={name || ""}
      >
        {(name || "?").slice(0, 1)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name || ""} className={className} />
  );
}
