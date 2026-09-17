"use client";

// Chat settings modal — ChatSettingsModal + CollapsibleSetting.
// The server actions
// resetChat / deleteCompanionMemory map to local POST /api/chat/reset and
// POST /api/chat/memory/delete. The "Unrestricted" premium row is
// intentionally not ported (NSFW & premium removed product-wide). Confirm
// flows use the local Dialog (copy/behaviour kept
// verbatim, incl. the 2s refresh+reload after reset).
import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Brain, ChevronDown, RotateCcw, Settings2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* source 716980: collapsible row — title + chevron, expanded shows
   description and either an action slot or a Switch */
function CollapsibleSetting({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg font-semibold">{title}</span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="flex items-start justify-between gap-4 pb-5">
          <p className="text-sm text-muted-foreground">{description}</p>
          {action !== undefined && <div className="shrink-0">{action}</div>}
        </div>
      )}
    </div>
  );
}

type ConfirmTarget = "memory" | "reset" | null;

export function ChatSettingsModal({ companionId }: { companionId: string }) {
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [confirmTarget, setConfirmTarget] = React.useState<ConfirmTarget>(null);
  const [busy, setBusy] = React.useState(false);

  const post = async (url: string) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companionId }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.success) throw new Error(j.message || j.error || `HTTP ${r.status}`);
    return j;
  };

  /* source R(): reset -> toast -> close -> refresh + reload after 2s */
  const doReset = async () => {
    setBusy(true);
    try {
      await post("/api/chat/reset");
      toast.success(t("resetSuccess"));
      setOpen(false);
      setConfirmTarget(null);
      setTimeout(() => {
        router.refresh();
        window.location.reload();
      }, 2000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tc("error"));
    } finally {
      setBusy(false);
    }
  };

  /* source T(): delete memory -> toast -> close (chat history stays) */
  const doDeleteMemory = async () => {
    setBusy(true);
    try {
      await post("/api/chat/memory/delete");
      toast.success(t("deleteMemorySuccess", { default: "Memory deleted" }));
      setOpen(false);
      setConfirmTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tc("error"));
    } finally {
      setBusy(false);
    }
  };

  const dangerBtn =
    "w-full justify-start text-red-500 hover:text-red-400 hover:bg-red-950/30";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        title={t("chatSettings", { default: "Chat Settings" })}
        aria-label={t("chatSettings", { default: "Chat Settings" })}
      >
        <Settings2 className="h-4 w-4" />
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setConfirmTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("chatSettings", { default: "Chat Settings" })}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("chatSettings", { default: "Chat Settings" })}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-surface-container border border-border rounded-lg px-6">
            <CollapsibleSetting
              title={t("roleplayMode", { default: "Roleplay mode" })}
              description={t("roleplayCtaDescription")}
              action={
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-border hover:bg-surface-container hover:text-foreground"
                >
                  <Link href={`/roleplay?companion=${companionId}`} onClick={() => setOpen(false)}>
                    {t("goToRoleplay", { default: "Go to Roleplay" })}
                  </Link>
                </Button>
              }
            />
          </div>

          <div className="border-t border-border pt-4 space-y-1">
            <Button variant="ghost" className={dangerBtn} onClick={() => setConfirmTarget("memory")}>
              <Brain className="h-4 w-4 mr-2" />
              {t("deleteMemory", { default: "Delete memory" })}
            </Button>
            <Button variant="ghost" className={dangerBtn} onClick={() => setConfirmTarget("reset")}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {t("resetChat")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* confirm step — standard confirm copy/flow */}
      <Dialog open={confirmTarget !== null} onOpenChange={(v) => !v && !busy && setConfirmTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmTarget === "memory" ? t("deleteMemory", { default: "Delete memory" }) : t("resetChat")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {confirmTarget === "memory" ? t("confirmDeleteMemory") : t("confirmReset")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setConfirmTarget(null)}>
              {tc("cancel")}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={busy}
              onClick={confirmTarget === "memory" ? doDeleteMemory : doReset}
            >
              {busy
                ? tc("loading")
                : confirmTarget === "memory"
                  ? t("deleteMemory", { default: "Delete memory" })
                  : t("resetChat")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
