"use client";

// tail — AuthProvider composition:
//   AuthStateProvider > AuthModalProvider > children
//     + OnboardingGate (user && !onboardingComplete -> forced modal)
//     + AuthModal
//     + AuthQuerySync (?auth=1&redirectTo=, ?show_onboarding=1)
//     + WelcomeGate (?show_welcome=1 -> FreePlanDialog)
import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AuthStateProvider, useAuthState } from "./auth-state";
import { AuthModalProvider, useAuthModal } from "./auth-modal-context";
import { AuthModal, FreePlanDialog } from "./auth-modal";

const WELCOME_PARAM = "show_welcome";

function OnboardingGate({ onboardingComplete }: { onboardingComplete: boolean }) {
  const { openOnboardingModal } = useAuthModal();
  const { user } = useAuthState();
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (!!user && !onboardingComplete && !fired.current) {
      fired.current = true;
      openOnboardingModal();
    }
  }, [user, onboardingComplete, openOnboardingModal]);
  return null;
}

function AuthQuerySync() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { openAuthModal, openOnboardingModal, isOpen } = useAuthModal();
  const { user, isLoading } = useAuthState();

  React.useEffect(() => {
    const auth = params.get("auth");
    const redirectTo = params.get("redirectTo");
    if (auth && !isOpen) {
      openAuthModal(redirectTo || undefined);
      const next = new URLSearchParams(params.toString());
      next.delete("auth");
      next.delete("redirectTo");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [params, openAuthModal, isOpen, router, pathname]);

  React.useEffect(() => {
    if (params.get("show_onboarding") === "1" && !isLoading && user && !isOpen) {
      openOnboardingModal();
      const next = new URLSearchParams(params.toString());
      next.delete("show_onboarding");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [params, user, isLoading, openOnboardingModal, isOpen, router, pathname]);

  return null;
}

function WelcomeGate() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuthState();
  const { isFreePlanWelcomeOpen, openFreePlanWelcome, closeFreePlanWelcome } =
    useAuthModal();

  React.useEffect(() => {
    if (params.get(WELCOME_PARAM) !== "1" || isLoading || !user) {
      return;
    }
    openFreePlanWelcome();
    const next = new URLSearchParams(params.toString());
    next.delete(WELCOME_PARAM);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, user, isLoading, openFreePlanWelcome, router, pathname]);

  return <FreePlanDialog open={isFreePlanWelcomeOpen} onClose={closeFreePlanWelcome} />;
}

export function AuthProvider({
  children,
  serverUser,
  onboardingComplete = true,
}: {
  children: React.ReactNode;
  serverUser?: { id: string; email: string } | null;
  onboardingComplete?: boolean;
}) {
  return (
    <AuthStateProvider serverUser={serverUser} key={serverUser?.id ?? "anon"}>
      <AuthModalProvider>
        {children}
        <React.Suspense fallback={null}>
          <OnboardingGate onboardingComplete={onboardingComplete} />
        </React.Suspense>
        <AuthModal serverAuthenticated={serverUser != null} />
        <React.Suspense fallback={null}>
          <AuthQuerySync />
        </React.Suspense>
        <React.Suspense fallback={null}>
          <WelcomeGate />
        </React.Suspense>
      </AuthModalProvider>
    </AuthStateProvider>
  );
}
