"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterCard, type HomeCompanion } from "./home/character-card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge-card";

type Companion = HomeCompanion & {
  nameTranslations?: Record<string, string>;
  bioTranslations?: Record<string, string>;
  occupationTranslations?: Record<string, string>;
  ethnicityTranslations?: Record<string, string>;
  relationshipTranslations?: Record<string, string>;
  personality?: string;
  occupation?: string;
  archetype?: string | null;
  hobbies?: string[];
  ethnicity?: string;
  relationship?: string;
};

export function CharacterBySlugPage() {
  const router = useRouter();
  const pathname = (typeof window !== "undefined") ? window.location.pathname : "/zh-Hans";
  const slug = pathname.split("/").pop() || "";
  const [comp, setComp] = useState<Companion | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/companions?slug=${encodeURIComponent(slug)}`).then(async (r) => {
      if (!r.ok) return setComp(null);
      const j = await r.json();
      setComp(j.companions?.[0] || null);
    }).catch(() => setComp(null));
  }, [slug]);

  if (comp === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-effect h-64 w-full max-w-3xl animate-pulse rounded-2xl" />
      </div>
    );
  }
  if (comp === null) {
    return (
      <main className="flex min-h-screen flex-col">
        <div className="border-b border-border px-4 py-3 md:px-6">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> 返回
          </button>
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">角色不存在</h1>
          <p className="mt-2 text-sm text-muted-foreground">{slug}</p>
          <Button onClick={() => router.push(pathname.startsWith("/en") ? "/en" : "/")} className="mt-4 gradient-cta neon-glow-primary">返回首页</Button>
        </div>
      </main>
    );
  }

  const zh = comp.nameTranslations?.["zh-Hans"] || comp.name;
  const bioZh = comp.bioTranslations?.["zh-Hans"] || comp.bio;
  const occZh = comp.occupationTranslations?.["zh-Hans"] || comp.occupation;
  const ethnicZh = comp.ethnicityTranslations?.["zh-Hans"] || comp.ethnicity;
  const relZh = comp.relationshipTranslations?.["zh-Hans"] || comp.relationship;

  return (
    <main className="flex min-h-screen flex-col">
      <div className="border-b border-border px-4 py-3 md:px-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 返回
        </button>
      </div>
      <div className="sw-scroll flex-1 overflow-y-auto bg-background px-4 py-6 md:px-6">
        <div className="mx-auto flex max-w-3xl flex-col">
          {/* Portrait card */}
          <div className="relative aspect-[3/4] mx-auto w-full max-w-xs overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10">
            <img src={comp.imageUrl} alt={zh} className="h-full w-full object-cover" />
          </div>

          {/* Info card */}
          <div className="mt-6 glass-flat rounded-2xl p-6">
            <h1 className="text-2xl font-bold text-foreground">{zh}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {comp.age && <Badge className="bg-primary text-white">{comp.age}岁</Badge>}
              {occZh && <Badge>{occZh}</Badge>}
              {ethnicZh && <Badge>{ethnicZh}</Badge>}
              {relZh && <Badge>{relZh}</Badge>}
              {comp.archetype && <Badge>{comp.archetype}</Badge>}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/70">性格</h3>
                <p className="mt-1 text-sm text-foreground">{comp.personality || "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/70">爱好</h3>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(comp.hobbies || []).map((h) => (
                    <Badge key={h} variant="secondary">{h}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/70">背景故事</h3>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{bioZh || "—"}</p>
              </div>
            </div>

            <Button onClick={() => router.push(`/chat/${comp.slug}`)} className="mt-6 w-full gradient-cta neon-glow-primary h-11 text-base">
              <MessageCircle className="mr-2 h-4 w-4" /> 立即聊天
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
