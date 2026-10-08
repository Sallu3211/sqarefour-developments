"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export type Role = "editor" | "viewer";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** null = not signed in, or signed in but no PIN accepted yet. */
  role: Role | null;
  isViewer: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  loginWithPin: (role: Role, pin: string | null) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Email/password users are always editors. Anonymous (PIN) users get their
// role from my_role() (see supabase/viewer-access.sql). If that function
// doesn't exist yet (SQL not run), fall back to editor so nothing breaks.
async function fetchRole(user: User | null): Promise<Role | null> {
  if (!user) return null;
  if (!user.is_anonymous) return "editor";
  const { data, error } = await supabase.rpc("my_role");
  if (error) return "editor";
  return (data as Role | null) ?? null;
}

const PIN_ERRORS: Record<string, string> = {
  wrong: "Wrong PIN — try again.",
  locked: "Too many wrong tries. Wait 10 minutes and try again.",
  not_set: "Viewer login isn't set up yet. Ask the owner for access.",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const roleRequest = useRef(0);

  const user = session?.user ?? null;

  const refreshRole = useCallback(async (u: User | null) => {
    const id = ++roleRequest.current;
    setRoleLoading(true);
    const next = await fetchRole(u);
    if (id !== roleRequest.current) return;
    setRole(next);
    setRoleLoading(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSessionLoading(false);
      setRoleLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (sessionLoading) return;
    refreshRole(user);
    // Only re-resolve when the signed-in user actually changes, not on
    // every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, sessionLoading, refreshRole]);

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) return { error: "Supabase is not configured yet." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }

  // Home-page Login / Viewer Login. Requires "Allow anonymous sign-ins" in
  // Supabase → Authentication → Sign In / Providers. A wrong PIN keeps the
  // anonymous session (with no access) so retries don't create new users.
  async function loginWithPin(asRole: Role, pin: string | null) {
    if (!isSupabaseConfigured) return { error: "Supabase is not configured yet." };
    let current = user;
    if (!current) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) return { error: error.message };
      current = data.user;
    }
    const { data: result, error } = await supabase.rpc("login_with_pin", { p_role: asRole, p_pin: pin });
    if (error) {
      // SQL not run yet: keep the old open Login working, viewers can't log in.
      if (asRole === "viewer") return { error: PIN_ERRORS.not_set };
    } else if (result !== "ok") {
      return { error: PIN_ERRORS[result as string] ?? "Couldn't log in — try again." };
    }
    await refreshRole(current);
    return { error: null };
  }

  async function signOut() {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }

  async function requestPasswordReset(email: string) {
    if (!isSupabaseConfigured) return { error: "Supabase is not configured yet." };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error ? error.message : null };
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading: sessionLoading || roleLoading,
        role,
        isViewer: role === "viewer",
        signIn,
        loginWithPin,
        signOut,
        requestPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
