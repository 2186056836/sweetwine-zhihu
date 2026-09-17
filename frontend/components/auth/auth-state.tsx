"use client";

// AuthStateProvider/useAuthState:
// seeds from the server user, then tracks supabase auth state changes.
import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = { user: User | null; isLoading: boolean };

const AuthStateContext = React.createContext<AuthState>({
  user: null,
  isLoading: true,
});

export function AuthStateProvider({
  children,
  serverUser,
}: {
  children: React.ReactNode;
  serverUser?: { id: string; email: string } | null;
}) {
  const [user, setUser] = React.useState<User | null>(() =>
    serverUser
      ? ({
          id: serverUser.id,
          aud: "authenticated",
          role: "authenticated",
          email: serverUser.email,
          email_confirmed_at: undefined,
          phone: "",
          confirmed_at: undefined,
          last_sign_in_at: undefined,
          app_metadata: {},
          user_metadata: {},
          identities: [],
          created_at: "",
          updated_at: "",
          is_anonymous: false,
        } as User)
      : null,
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(() => serverUser == null);

  React.useEffect(() => {
    const client = supabase();
    client.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthStateContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthStateContext.Provider>
  );
}

export const useAuthState = () => React.useContext(AuthStateContext);
