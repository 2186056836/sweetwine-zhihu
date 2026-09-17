"use client";

// /discover — companion grid from the PostgREST-compatible surface.
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { listCompanions, type Companion } from "@/lib/api";
import { Search } from "lucide-react";
import { AvatarImg } from "@/components/avatar-fallback";

const ARCHETYPES = [
  { id: "", label: "全部" },
  { id: "girlfriend", label: "AI 女友" },
  { id: "female", label: "女生" },
  { id: "male", label: "男生" },
  { id: "boyfriend", label: "AI 男友" },
];

export function DiscoverGrid() {
  const [rows, setRows] = useState<Companion[] | null>(null);
  const [q, setQ] = useState("");
  const [arch, setArch] = useState("");

  useEffect(() => {
    listCompanions(96).then(setRows);
  }, []);

  const filtered = useMemo(() => {
    let out = rows || [];
    if (arch) out = out.filter((c) => (c.archetype || "") === arch);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      out = out.filter((c) => (c.name || "").toLowerCase().includes(s));
    }
    return out;
  }, [rows, q, arch]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold">发现</h1>
      <p className="mt-1 text-sm text-muted-foreground">找到你的 AI 角色</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="glass-effect flex h-10 min-w-56 flex-1 items-center gap-2 rounded-full px-4 md:max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索角色…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
        </div>
        {ARCHETYPES.map((a) => (
          <button
            key={a.id}
            onClick={() => setArch(a.id)}
            className={
              "h-9 rounded-full px-4 text-sm font-medium transition-colors " +
              (arch === a.id
                ? "gradient-cta text-white"
                : "glass-effect text-muted-foreground hover:text-foreground")
            }
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {rows === null &&
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-surface-container-low/80" />
          ))}
        {filtered.map((c) => (
          <Link
            key={c.id}
            href={"/chat/" + c.slug}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl"
          >
            <AvatarImg
              src={c.imageUrl}
              name={c.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-sm font-semibold text-white">{c.name}</h3>
                {c.isNew ? (
                  <span className="gradient-cta flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white">NEW</span>
                ) : null}
              </div>
              {c.age != null && (
                <p className="mt-0.5 text-[11px] text-white/70">{c.age} 岁</p>
              )}
            </div>
          </Link>
        ))}
      </div>
      {rows !== null && filtered.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">没有匹配的角色</p>
      )}
    </main>
  );
}
