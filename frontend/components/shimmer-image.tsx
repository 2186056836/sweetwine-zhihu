"use client";

// MediaShimmer progress overlay +
// ShimmerImage (next/image wrapped with a load-state shimmer), verbatim logic.
import * as React from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

export function MediaShimmer({
  loadingType,
  mode = "generate",
}: {
  loadingType: "image" | "video";
  mode?: "generate" | "fetch";
}) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (mode === "fetch") {
      return;
    }
    const duration = loadingType === "image" ? 21000 : 45000;
    const start = Date.now();
    const iv = setInterval(() => {
      setProgress(Math.min(100, Math.round(((Date.now() - start) / duration) * 100)));
    }, duration / 100);
    return () => clearInterval(iv);
  }, [loadingType, mode]);

  return (
    <>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      {mode === "generate" && (
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-surface-container-high">
          <div
            className="h-full bg-primary/80 transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </>
  );
}

type ShimmerImageProps = Omit<ImageProps, "ref"> & {
  wrapperClassName?: string;
  disableShimmer?: boolean;
};

export function ShimmerImage({
  className,
  wrapperClassName,
  disableShimmer,
  onLoad,
  fill,
  ...props
}: ShimmerImageProps) {
  const [loaded, setLoaded] = React.useState(false);

  const refCb = React.useCallback((el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  if (disableShimmer) {
    return <Image {...props} fill={fill} className={className} onLoad={onLoad} />;
  }

  const shimmer = loaded ? null : (
    <span className="absolute inset-0 z-10 overflow-hidden" aria-hidden>
      <MediaShimmer loadingType="image" mode="fetch" />
    </span>
  );

  const img = (
    <Image
      {...props}
      fill={fill}
      ref={refCb}
      className={className}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
    />
  );

  if (fill) {
    return (
      <>
        {shimmer}
        {img}
      </>
    );
  }
  return (
    <span className={cn("relative inline-block overflow-hidden", wrapperClassName)}>
      {shimmer}
      {img}
    </span>
  );
}
