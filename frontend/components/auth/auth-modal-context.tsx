"use client";

// AuthModalProvider/useAuthModal,
// state machine and 300ms teardown delay verbatim.
import * as React from "react";

type AuthModalContextValue = {
  isOpen: boolean;
  redirectTo: string | null;
  onAuthComplete: (() => void) | null;
  isOnboardingForced: boolean;
  isFreePlanWelcomeOpen: boolean;
  openAuthModal: (redirectTo?: string | null, onAuthComplete?: (() => void) | null) => void;
  closeAuthModal: () => void;
  openOnboardingModal: () => void;
  clearOnboardingForced: () => void;
  openFreePlanWelcome: () => void;
  closeFreePlanWelcome: () => void;
};

const AuthModalContext = React.createContext<AuthModalContextValue | undefined>(
  undefined,
);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [redirectTo, setRedirectTo] = React.useState<string | null>(null);
  const [isOnboardingForced, setOnboardingForced] = React.useState(false);
  const [isFreePlanWelcomeOpen, setFreePlanWelcomeOpen] = React.useState(false);
  const cbRef = React.useRef<(() => void) | null>(null);
  const [onAuthComplete, setOnAuthComplete] = React.useState<(() => void) | null>(null);

  const openAuthModal = React.useCallback(
    (redirect?: string | null, cb?: (() => void) | null) => {
      setRedirectTo(redirect || null);
      cbRef.current = cb || null;
      setOnAuthComplete(cb ? () => cb : null);
      setIsOpen(true);
    },
    [],
  );

  const closeAuthModal = React.useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      setRedirectTo(null);
      cbRef.current = null;
      setOnAuthComplete(null);
    }, 300);
  }, []);

  const openOnboardingModal = React.useCallback(() => {
    setOnboardingForced(true);
    setIsOpen(true);
  }, []);

  const clearOnboardingForced = React.useCallback(() => {
    setOnboardingForced(false);
  }, []);

  const openFreePlanWelcome = React.useCallback(() => {
    setFreePlanWelcomeOpen(true);
  }, []);

  const closeFreePlanWelcome = React.useCallback(() => {
    setFreePlanWelcomeOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        redirectTo,
        onAuthComplete,
        isOnboardingForced,
        isFreePlanWelcomeOpen,
        openAuthModal,
        closeAuthModal,
        openOnboardingModal,
        clearOnboardingForced,
        openFreePlanWelcome,
        closeFreePlanWelcome,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = React.useContext(AuthModalContext);
  if (ctx === undefined) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return ctx;
}
