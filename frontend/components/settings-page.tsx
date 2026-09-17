"use client";

// /settings/profile — nickname/gender edit, password change, logout.
// Contracts: GET /api/profile, POST /api/profile/update,
//            POST /api/auth/password, supabase.auth.signOut().
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { LogOut, Settings, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getProfile, type Profile } from "@/lib/api";

const GENDERS = [
  { id: "male", label: "男" },
  { id: "female", label: "女" },
  { id: "other", label: "其他" },
];

export function SettingsProfilePage() {
  const locale = useLocale();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState("male");
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ cur: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      if (p) {
        setNickname(p.nickname || "");
        setGender(p.gender || "male");
      }
    });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const r = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), gender }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || j.error || "update failed");
      toast.success("资料已保存");
      setProfile(await getProfile());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwBusy) return;
    if (pw.next.length < 8) {
      toast.error("新密码至少 8 位");
      return;
    }
    if (pw.next !== pw.confirm) {
      toast.error("两次输入的新密码不一致");
      return;
    }
    setPwBusy(true);
    try {
      const r = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pw.cur, newPassword: pw.next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.success === false) throw new Error(j.message || j.error || r.statusText);
      toast.success("密码已更新");
      setPw({ cur: "", next: "", confirm: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPwBusy(false);
    }
  }

  async function logout() {
    try {
      await supabase().auth.signOut();
    } catch {
      /* local session already gone */
    }
    window.location.href = "/" + locale + "/login";
  }

  const inputCls =
    "glass-effect h-11 w-full rounded-xl bg-white/5 px-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Settings className="h-6 w-6 text-primary" /> 账户设置
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{profile?.email || "…"}</p>

      <form onSubmit={saveProfile} className="glass-effect mt-6 rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">个人资料</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">昵称</label>
            <input className={inputCls} value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">性别</label>
            <div className="flex gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGender(g.id)}
                  className={
                    "h-10 rounded-full px-5 text-sm font-medium " +
                    (gender === g.id ? "gradient-cta text-white" : "glass-effect text-muted-foreground hover:text-foreground")
                  }
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="gradient-cta mt-5 h-10 rounded-full px-6 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存资料"}
        </button>
      </form>

      <form onSubmit={changePassword} className="glass-effect mt-5 rounded-2xl p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
          <ShieldCheck className="h-4 w-4" /> 修改密码
        </h2>
        <div className="mt-4 space-y-3">
          <input className={inputCls} type="password" placeholder="当前密码（未设置过则留空）" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} autoComplete="current-password" />
          <input className={inputCls} type="password" placeholder="新密码（至少 8 位）" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" required />
          <input className={inputCls} type="password" placeholder="确认新密码" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" required />
        </div>
        <button type="submit" disabled={pwBusy} className="glass-effect mt-5 h-10 rounded-full px-6 text-sm font-bold text-primary disabled:opacity-50">
          {pwBusy ? "提交中…" : "更新密码"}
        </button>
      </form>

      <button
        onClick={logout}
        className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
      >
        <LogOut className="h-4 w-4" /> 退出登录
      </button>
    </main>
  );
}
