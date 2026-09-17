"use client";

// /my-ai — user's custom characters (companions.isCustom=1). Create flow is
// Phase B batch 2; for now: list + empty state + deep link to /create.
import { useEffect, useState } from "react";
import { AvatarImg } from "@/components/avatar-fallback";
import { Link } from "@/i18n/navigation";
import { Sparkles } from "lucide-react";
import type { Companion } from "@/lib/api";

export function MyAiPage() {
  const [rows, setRows] = useState<Companion[] | null>(null);

  useEffect(() => {
    fetch("/sb/rest/v1/companions?select=id,slug,name,imageUrl,archetype,personality,isCustom&isCustom=eq.1")
      .then((r) => (r.ok ? r.json() : []))
      .then((j) => setRows(Array.isArray(j) ? j : []))
      .catch(() => setRows([]));
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Sparkles className="h-6 w-6 text-primary" /> 我的 AI
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">你创建的自定义角色</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {rows === null &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-surface-container-low/80" />
          ))}
        {(rows || []).map((c) => (
          <Link key={c.id} href={"/chat/" + c.slug} className="group relative aspect-[3/4] overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <AvatarImg src={c.imageUrl} name={c.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-10">
              <h3 className="truncate text-sm font-semibold text-white">{c.name}</h3>
              <p className="text-[11px] text-white/70">自定义</p>
            </div>
          </Link>
        ))}
      </div>

      {rows !== null && rows.length === 0 && (
        <div className="glass-effect mt-2 rounded-2xl p-12 text-center">
          <p className="text-sm text-muted-foreground">还没有创建过 AI 角色</p>
          <Link
            href="/create"
            className="gradient-cta neon-glow-primary mt-4 inline-flex h-11 items-center rounded-full px-7 text-sm font-bold text-white"
          >
            创建 AI 角色
          </Link>
        </div>
      )}
    </main>
  );
}
