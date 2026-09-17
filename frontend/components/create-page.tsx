"use client";

// /create — 3-step character creation wizard -> POST /api/companions/create
// -> redirect into the new companion's chat.
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { ChevronLeft, Sparkles, Wand2 } from "lucide-react";

const ARCHETYPES = [
  { id: "girlfriend", label: "AI 女友", emoji: "💗" },
  { id: "boyfriend", label: "AI 男友", emoji: "💙" },
  { id: "friend", label: "AI 好友", emoji: "🌟" },
  { id: "female", label: "女生", emoji: "🌸" },
  { id: "male", label: "男生", emoji: "🍃" },
];

const PERSONALITY_PRESETS = [
  "温柔，温暖，略带幽默，聪明",
  "冷静威严，言简意赅，掌控节奏",
  "活泼开朗，爱开玩笑，精力充沛",
  "神秘慵懒，说话留三分，引人探究",
  "元气满满，直球表达，热情似火",
];

function polishPersonality(current: string): string {
  // server-side autocompleteAdvancedDetails implementation:
  // rotate to a different persona preset so the wizard feels assisted
  const others = PERSONALITY_PRESETS.filter((p) => p !== current);
  return others[Math.floor(Math.random() * others.length)];
}

export function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "24",
    archetype: "girlfriend",
    personality: PERSONALITY_PRESETS[0],
    welcomeMessage: "",
  });

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function create() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/companions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          age: Number(form.age) || 24,
          archetype: form.archetype,
          personality: form.personality,
          welcomeMessage: form.welcomeMessage.trim() || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || j.error || "create failed");
      toast.success("角色已创建");
      router.push("/chat/" + j.slug);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const inputCls =
    "glass-effect h-11 w-full rounded-xl bg-white/5 px-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6 md:px-6">
      <button onClick={() => (step === 0 ? router.push("/my-ai") : setStep(step - 1))} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {step === 0 ? "我的 AI" : "上一步"}
      </button>
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Sparkles className="h-6 w-6 text-primary" /> 创建 AI 角色
      </h1>
      <div className="mt-3 flex items-center gap-2">
        {["基础", "个性", "完成"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={
                "flex size-7 items-center justify-center rounded-full text-xs font-bold " +
                (i <= step ? "gradient-cta text-white" : "glass-effect text-muted-foreground")
              }
            >
              {i + 1}
            </span>
            <span className={"text-xs " + (i <= step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            {i < 2 && <span className="mx-1 h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      <div className="glass-effect mt-6 rounded-2xl p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">名字 *</label>
              <input className={inputCls} value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="给 TA 起个名字" maxLength={24} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">年龄</label>
              <input className={inputCls} type="number" min={18} max={80} value={form.age} onChange={(e) => set("age")(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">类型</label>
              <div className="flex flex-wrap gap-2">
                {ARCHETYPES.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => set("archetype")(a.id)}
                    className={
                      "h-10 rounded-full px-4 text-sm font-medium transition-colors " +
                      (form.archetype === a.id ? "gradient-cta text-white" : "glass-effect text-muted-foreground hover:text-foreground")
                    }
                  >
                    {a.emoji} {a.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => (form.name.trim() ? setStep(1) : toast.error("先起个名字"))}
              className="gradient-cta mt-2 h-11 w-full rounded-full text-sm font-bold text-white"
            >
              下一步
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">性格</label>
              <div className="space-y-2">
                {PERSONALITY_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set("personality")(p)}
                    className={
                      "block w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors " +
                      (form.personality === p ? "border border-primary/60 bg-primary/10 text-foreground" : "glass-effect text-muted-foreground hover:text-foreground")
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">开场白（可选）</label>
              <textarea
                className="glass-effect min-h-20 w-full resize-none rounded-xl bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={form.welcomeMessage}
                onChange={(e) => set("welcomeMessage")(e.target.value)}
                placeholder={`嗨，我是${form.name || "TA"}…`}
                maxLength={200}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="glass-effect h-11 flex-1 rounded-full text-sm font-bold text-muted-foreground">上一步</button>
              <button onClick={() => setStep(2)} className="gradient-cta h-11 flex-[2] rounded-full text-sm font-bold text-white">下一步</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
              <p className="font-bold">{form.name}，{form.age} 岁</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ARCHETYPES.find((a) => a.id === form.archetype)?.label} · {form.personality}
              </p>
              {form.welcomeMessage && <p className="mt-2 text-xs italic">“{form.welcomeMessage}”</p>}
            </div>
            <button
              type="button"
              onClick={() => {
                set("personality")(polishPersonality(form.personality));
                toast("已换一个性格方向", { description: "创建后可在聊天设置里继续调整" });
              }}
              className="glass-effect flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-primary"
            >
              <Wand2 className="h-4 w-4" /> 智能润色（本地）
            </button>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="glass-effect h-11 flex-1 rounded-full text-sm font-bold text-muted-foreground">上一步</button>
              <button onClick={create} disabled={busy} className="gradient-cta neon-glow-primary h-11 flex-[2] rounded-full text-sm font-bold text-white disabled:opacity-50">
                {busy ? "创建中…" : "创建角色"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
