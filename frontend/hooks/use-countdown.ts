"use client";

// useCountdown: sale-end cookie
// (sweetwine_sale_end, legacy sweetwine-legacy-sale-end), 3-day auto-renew, 1s tick.
import { useEffect, useState } from "react";

const COOKIE = "sweetwine_sale_end";
const LEGACY_COOKIE = "sweetwine-legacy-sale-end";
const WINDOW_MS = 259200000; // 3 days

function readEnd(name: string): number | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!m) return null;
  const v = parseInt(m[1], 10);
  return isNaN(v) ? null : v;
}

function writeEnd(value: number) {
  document.cookie = `${COOKIE}=${value}; path=/; max-age=604800; samesite=lax`;
}

export type Countdown = { hours: string; minutes: string; seconds: string };

function fmt(ms: number): Countdown {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    hours: String(Math.floor(total / 3600)).padStart(2, "0"),
    minutes: String(Math.floor((total % 3600) / 60)).padStart(2, "0"),
    seconds: String(total % 60).padStart(2, "0"),
  };
}

export function useCountdown(): Countdown | null {
  const [left, setLeft] = useState<Countdown | null>(null);

  useEffect(() => {
    let end = readEnd(COOKIE) ?? readEnd(LEGACY_COOKIE);

    function tick() {
      const diff = (end as number) - Date.now();
      if (diff <= 0) {
        end = Date.now() + WINDOW_MS;
        writeEnd(end);
        setLeft(fmt(WINDOW_MS));
      } else {
        setLeft(fmt(diff));
      }
    }

    if (!end || end <= Date.now()) {
      end = Date.now() + WINDOW_MS;
      writeEnd(end);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return left;
}
