"use client";

// /campus — Zhihu-sourced campus emotional-companion hub (2026-09 pivot):
// collect real Zhihu Q&A material on campus emotional topics, browse answer
// summaries, and one-click distill any material into an AI companion character.
// Quota-aware: all Zhihu calls are server-cached; remaining quota is displayed.
// Strings hardcoded zh (site default locale), matching generate-pages convention.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { GraduationCap, HeartHandshake, Loader2, Flame, BookOpen } from "lucide-react";
import { listCompanions, type Companion } from "@/lib/api";

type ZhItem = {
  Title: string;
  ContentType?: string;
  ContentText?: string;
  Url: string;
  VoteUpCount?: number;
  AuthorName?: string;
  Summary?: string;
};
type QuotaRow = { APIID: string; APIName: string; RemainingQuota: number; TotalQuota: number };

const TOPICS = [
  { id: "confession", label: "表白与暗恋", query: "大学 表白 暗恋 怎么办" },
  { id: "breakup", label: "失恋走出", query: "失恋 走不出来 大学 怎么办" },
  { id: "dorm", label: "宿舍关系", query: "大学 宿舍关系 矛盾 相处" },
  { id: "exam", label: "考研压力", query: "考研 焦虑 压力 大 怎么办" },
  { id: "grad", label: "毕业迷茫", query: "大学毕业 迷茫 未来 方向" },
  { id: "longdist", label: "异地恋", query: "异地恋 大学 坚持 还是 放弃" },
  { id: "social", label: "社交焦虑", query: "大学 社交焦虑 不敢 说话" },
  { id: "family", label: "家庭沟通", query: "和父母 沟通 冲突 理解" },
];

const stripEm = (s: string) => String(s || "").replace(/<\/?em>/g, "");

export function CampusPage() {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [items, setItems] = useState<ZhItem[] | null>(null);
  const [answersFor, setAnswersFor] = useState<string | null>(null);
  const [answers, setAnswers] = useState<ZhItem[]>([]);
  const [quota, setQuota] = useState<QuotaRow[] | null>(null);
  const [hot, setHot] = useState<{ Title: string; Url: string }[] | null>(null);
  const [made, setMade] = useState<Companion[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const loadTopic = useCallback(async (t: (typeof TOPICS)[number]) => {
    setTopic(t);
    setItems(null);
    setAnswersFor(null);
    try {
      const r = await fetch(`/api/zhihu/search?query=${encodeURIComponent(t.query)}`);
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || j.error);
      setItems(j.items || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    loadTopic(TOPICS[0]);
    fetch("/api/zhihu/quota")
      .then((r) => r.json())
      .then((j) => j.success && setQuota(j.items || []))
      .catch(() => {});
    listCompanions(100).then((rows) => setMade(rows.filter((c) => String(c.slug || "").startsWith("zhihu-"))));
  }, [loadTopic]);

  async function showAnswers(url: string) {
    if (answersFor === url) return setAnswersFor(null);
    setAnswersFor(url);
    setAnswers([]);
    try {
      const r = await fetch(`/api/zhihu/answers?questionUrl=${encodeURIComponent(url)}`);
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || j.error);
      setAnswers(j.items || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function createCompanion(item: ZhItem) {
    const key = item.Url || item.Title;
    setBusy(key);
    try {
      const isQuestion = item.Url.includes("/question/");
      const itemExcerpt = [
        { AuthorName: item.AuthorName, Summary: stripEm(item.ContentText || ""), Url: item.Url, VoteUpCount: item.VoteUpCount },
      ];
      const r = await fetch("/api/zhihu/create-companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionTitle: item.Title,
          questionUrl: isQuestion ? item.Url : answersFor || "",
          topic: topic.label,
          answers: isQuestion && answers.length ? answers : itemExcerpt,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || j.error);
      toast.success(`已创建「${j.name}」— 去和 TA 聊聊`);
      setMade((m) => [...m, { id: j.companionId, slug: j.slug, name: j.name, imageUrl: j.coverUrl } as Companion]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const qSearch = quota?.find((q) => q.APIID === "zhihu_search");
  const qAnswers = quota?.find((q) => q.APIID === "question_answers");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <GraduationCap className="h-6 w-6 text-primary" /> 校园心事 · 知乎陪伴
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        从知乎真实问答里收集校园情感经验，一键生成懂这些心事的 AI 学长学姐，陪你聊天。完全免费。
      </p>

      <div className="glass-effect mt-4 flex items-start gap-2 rounded-2xl p-4 text-xs leading-relaxed text-muted-foreground">
        <HeartHandshake className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <p>
          AI 陪伴不能替代专业心理帮助。如果你或身边的人正经历心理危机，请第一时间联系学校心理中心、
          青少年服务台 <span className="text-foreground">12355</span> 或北京心理危机研究与干预中心{" "}
          <span className="text-foreground">010-82951332</span>。
        </p>
      </div>

      {quota && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          知乎接口今日余量：搜索 {qSearch?.RemainingQuota ?? "-"}/{qSearch?.TotalQuota ?? "-"} · 回答摘要{" "}
          {qAnswers?.RemainingQuota ?? "-"}/{qAnswers?.TotalQuota ?? "-"}（资料已缓存，放心浏览）
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            onClick={() => loadTopic(t)}
            className={
              "rounded-full px-4 py-1.5 text-sm " +
              (topic.id === t.id ? "gradient-cta text-white" : "glass-effect text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={async () => {
            if (hot) return setHot(null);
            try {
              const r = await fetch("/api/zhihu/hot");
              const j = await r.json();
              if (!r.ok || !j.success) throw new Error(j.message || j.error);
              setHot(j.items || []);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : String(e));
            }
          }}
          className="glass-effect flex items-center gap-1 rounded-full px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Flame className="h-4 w-4" /> 知乎热榜
        </button>
      </div>

      {hot && (
        <div className="glass-effect mt-3 rounded-2xl p-4">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            {hot.slice(0, 8).map((h, i) => (
              <li key={i}>
                <a href={h.Url} target="_blank" rel="noreferrer" className="text-foreground hover:text-primary">
                  {h.Title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {items === null && <p className="text-sm text-muted-foreground">正在从知乎收集「{topic.label}」资料…</p>}
        {items !== null && items.length === 0 && (
          <p className="text-sm text-muted-foreground">暂无资料（接口余量可能用尽，明天再来或换个主题）。</p>
        )}
        {(items || []).map((it, i) => {
          const key = it.Url || it.Title;
          return (
            <div key={i} className="glass-effect rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a href={it.Url} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:text-primary">
                    {it.Title}
                  </a>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {it.AuthorName || "知乎"} · {it.VoteUpCount ?? 0} 赞同 · {it.ContentType || "内容"}
                  </p>
                </div>
                <button
                  onClick={() => createCompanion(it)}
                  disabled={busy === key}
                  className="gradient-cta flex flex-shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {busy === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HeartHandshake className="h-3.5 w-3.5" />}
                  一键创建 AI 角色
                </button>
              </div>
              {it.ContentText && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{stripEm(it.ContentText)}</p>}
              {it.Url.includes("/question/") && (
                <button onClick={() => showAnswers(it.Url)} className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline">
                  <BookOpen className="h-3.5 w-3.5" /> {answersFor === it.Url ? "收起回答摘要" : "看回答摘要"}
                </button>
              )}
              {answersFor === it.Url && (
                <ul className="mt-2 space-y-2 border-t border-border/40 pt-2">
                  {answers.length === 0 && <li className="text-xs text-muted-foreground">加载中或暂无摘要…</li>}
                  {answers.map((a, j) => (
                    <li key={j} className="text-xs leading-relaxed text-muted-foreground">
                      <span className="text-foreground">{a.AuthorName || "知乎用户"}：</span>
                      {stripEm(a.Summary || a.ContentText || "").slice(0, 220)}…
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {made.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">已从知乎创建的陪伴角色</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {made.map((c) => (
              <Link key={c.id} href={`/chat/${c.slug || c.id}`} className="glass-effect rounded-2xl p-3 hover:ring-1 hover:ring-primary/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt={c.name || ""} className="aspect-[3/4] w-full rounded-xl object-cover" />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-white/5 text-2xl text-muted-foreground">
                    {(c.name || "?").slice(0, 1)}
                  </div>
                )}
                <p className="mt-2 truncate text-sm font-semibold">{c.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{c.bio || "知乎话题蒸馏角色"}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
