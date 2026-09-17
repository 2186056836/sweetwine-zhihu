"use client";

// UserMenu: signed-in profile
// dropdown (subscriptions / profile settings / invite / logout), signed-out
// create-account + login buttons opening the auth modal.
import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { ChevronDown, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useAuthState } from "@/components/auth/auth-state";

export function UserMenu({ user }: { user: { nickname?: string | null; email?: string | null } | null }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const { user: authUser } = useAuthState();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const logout = async () => {
    try {
      await supabase().auth.signOut();
      toast.success(t("auth.logoutSuccess"));
      window.location.href = `/${locale}`;
    } catch (e) {
      toast.error(t("auth.logoutError"));
      console.error(e);
    }
  };

  const profile =
    authUser || user
      ? {
          id: authUser?.id ?? "",
          email: authUser?.email || user?.email || "",
          nickname:
            (authUser?.user_metadata?.nickname as string) ||
            user?.nickname ||
            undefined,
        }
      : null;

  if (profile) {
    if (!mounted) {
      return (
        <Button variant="outline" size="sm" className="flex items-center gap-2 glass-effect border-white/10 text-foreground h-9 px-3" disabled>
          <span className="text-sm font-medium">
            {t("settings.myProfile", { default: "My Profile" })}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      );
    }
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 glass-effect border-white/10 hover:brightness-125 text-foreground hover:text-foreground h-9 px-3"
          >
            <span className="text-sm font-medium">
              {t("settings.myProfile", { default: "My Profile" })}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href="/settings/profile" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              {t("settings.profileSettings")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            {t("auth.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        className="gradient-cta neon-glow-primary rounded-full px-5 text-white font-semibold hover:opacity-90 transition-opacity duration-200"
        onClick={() => openAuthModal()}
      >
        {t("auth.createFreeAccount")}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="hidden sm:inline-flex rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-colors duration-200"
        onClick={() => openAuthModal()}
      >
        {t("auth.login")}
      </Button>
    </div>
  );
}
