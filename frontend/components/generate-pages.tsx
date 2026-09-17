"use client";

// /generate-image & /generate-video — pick a companion, describe, generate.
// Contracts: POST /api/media/image {companionId, prompt} -> {url}
//            POST /api/media/video {companionId, prompt, duration} -> {url, duration}
// Fully free — no token costs or balances anywhere.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Film, ImageIcon, Loader2, Sparkles } from "lucide-react";
import { listCompanions, type Companion } from "@/lib/api";
import {
  SUGGESTION_CATEGORIES,
  composePromptFromSelection,
  getRandomSelection,
} from "@/lib/suggestion-fragments";

type Result = { url: string; prompt: string };

function useGenerator(kind: "image" | "video") {
  const [comps, setComps] = useState<Companion[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    listCompanions(73).then((rows) => {
      setComps(rows);
      if (rows[0]) setPicked(rows[0].id);
    });
  }, []);

  async function generate() {
    if (!picked || busy) return;
    if (!prompt.trim()) {
      toast.error(kind === "image" ? "先描述想生成的图像" : "先描述想生成的视频");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch(kind === "image" ? "/api/media/image" : "/api/media/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "image"
            ? { companionId: picked, prompt: prompt.trim() }
            : { companionId: picked, prompt: prompt.trim(), duration },
        ),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || j.error || "generation failed");
      setResult({ url: j.url, prompt: prompt.trim() });
      toast.success(kind === "image" ? "图像已生成" : "视频已生成");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return { comps, picked, setPicked, prompt, setPrompt, duration, setDuration, busy, result, generate };
}

function CompanionStrip({
  comps,
  picked,
  setPicked,
}: {
  comps: Companion[] | null;
  picked: string | null;
  setPicked: (id: string) => void;
}) {
  return (
    <div className="sw-scroll mt-4 flex gap-3 overflow-x-auto pb-2">
      {(comps || []).slice(0, 24).map((c) => (
        <button key={c.id} onClick={() => setPicked(c.id)} className="flex-shrink-0 text-center">
          <div
            className={
              "size-16 overflow-hidden rounded-full transition-all " +
              (picked === c.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100")
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.imageUrl || ""} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
          </div>
          <p className="mt-1 w-16 truncate text-[11px] text-muted-foreground">{c.name}</p>
        </button>
      ))}
    </div>
  );
}

// SuggestionCategories: category tabs + chip row,
// click appends the promptFragment to the description; 随机组合 = one random
// item per category composed source-style. zh labels, English prompt fragments.
function SuggestionChips({ onAppend }: { onAppend: (frag: string) => void }) {
  const [tab, setTab] = useState(SUGGESTION_CATEGORIES[0].id);
  const cat = SUGGESTION_CATEGORIES.find((c) => c.id === tab) ?? SUGGESTION_CATEGORIES[0];
  return (
    <div className="mt-4 border-t border-border/40 pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">灵感碎片 · 点击并入描述</p>
        <button
          type="button"
          onClick={() => onAppend(composePromptFromSelection(getRandomSelection()))}
          className="glass-effect flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:text-foreground"
        >
          <Sparkles className="h-3.5 w-3.5" /> 随机组合
        </button>
      </div>
      <div className="mt-2 flex gap-1.5">
        {SUGGESTION_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setTab(c.id)}
            className={
              "rounded-full px-3 py-1 text-xs " +
              (tab === c.id ? "gradient-cta text-white" : "glass-effect text-muted-foreground hover:text-foreground")
            }
          >
            {c.labelZh}
          </button>
        ))}
      </div>
      <div className="sw-scroll mt-2 flex gap-2 overflow-x-auto pb-1">
        {cat.items.map((i) => (
          <button
            key={i.id}
            type="button"
            title={i.promptFragment}
            onClick={() => onAppend(i.promptFragment)}
            className="glass-effect flex-shrink-0 rounded-full px-3 py-1.5 text-xs text-foreground hover:ring-1 hover:ring-primary/60"
          >
            {i.labelZh}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GenerateImagePage() {
  const g = useGenerator("image");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <ImageIcon className="h-6 w-6 text-primary" /> 生成图像
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">用你的 AI 角色创作精美图像，完全免费</p>

      <CompanionStrip comps={g.comps} picked={g.picked} setPicked={g.setPicked} />

      <div className="glass-effect mt-4 rounded-2xl p-5">
        <label className="mb-1.5 block text-xs text-muted-foreground">图像描述</label>
        <textarea
          value={g.prompt}
          onChange={(e) => g.setPrompt(e.target.value)}
          placeholder="描述你想生成的图像… 例如：在海滩，穿红裙子"
          className="glass-effect min-h-24 w-full resize-none rounded-xl bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <SuggestionChips
          onAppend={(frag) =>
            g.setPrompt((p) => (p.trim() ? `${p.replace(/[,，]\s*$/, "")}, ${frag}` : frag))
          }
        />
        <div className="mt-4 flex items-center justify-end">
          <button
            onClick={g.generate}
            disabled={g.busy}
            className="gradient-cta neon-glow-primary flex h-11 items-center gap-2 rounded-full px-7 text-sm font-bold text-white disabled:opacity-50"
          >
            {g.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            {g.busy ? "生成中…" : "生成图像"}
          </button>
        </div>
      </div>

      {g.result && (
        <div className="glass-effect mt-5 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={g.result.url} alt={g.result.prompt} className="max-h-[480px] w-full object-contain bg-black/40" />
          <p className="px-4 py-3 text-xs text-muted-foreground">{g.result.prompt}</p>
        </div>
      )}
    </main>
  );
}

export function GenerateVideoPage() {
  const g = useGenerator("video");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Film className="h-6 w-6 text-primary" /> 生成视频
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">按需生成角色视频，完全免费</p>

      <CompanionStrip comps={g.comps} picked={g.picked} setPicked={g.setPicked} />

      <div className="glass-effect mt-4 rounded-2xl p-5">
        <label className="mb-1.5 block text-xs text-muted-foreground">视频描述</label>
        <textarea
          value={g.prompt}
          onChange={(e) => g.setPrompt(e.target.value)}
          placeholder="描述你想生成的视频… 例如：在咖啡馆对我微笑"
          className="glass-effect min-h-24 w-full resize-none rounded-xl bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">时长</span>
          {[3, 5, 10].map((d) => (
            <button
              key={d}
              onClick={() => g.setDuration(d)}
              className={
                "h-9 rounded-full px-4 text-sm font-medium " +
                (g.duration === d ? "gradient-cta text-white" : "glass-effect text-muted-foreground hover:text-foreground")
              }
            >
              {d}s
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end">
          <button
            onClick={g.generate}
            disabled={g.busy}
            className="gradient-cta neon-glow-primary flex h-11 items-center gap-2 rounded-full px-7 text-sm font-bold text-white disabled:opacity-50"
          >
            {g.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
            {g.busy ? "生成中…" : "生成视频"}
          </button>
        </div>
      </div>

      {g.result && (
        <div className="glass-effect mt-5 overflow-hidden rounded-2xl">
          <video src={g.result.url} controls autoPlay loop muted playsInline className="max-h-[480px] w-full bg-black" />
          <p className="px-4 py-3 text-xs text-muted-foreground">{g.result.prompt}</p>
        </div>
      )}
    </main>
  );
}
