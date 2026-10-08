"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export type Role = "editor" | "viewer";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: Role | null;
  isViewer: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  enter: () => Promise<{ error: string | null }>;
  enterAsViewer: (token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Email/password users are always editors. Anonymous users get their role
// from user_roles (see supabase/viewer-access.sql). If that table doesn't
// exist yet (migration not run), fall back to editor so nothing breaks.
async function fetchRole(user: User | null): Promise<Role | null> {
  if (!user) return null;
  if (!user.is_anonymous) return "editor";
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return "editor";
  return (data?.role as Role | undefined) ?? "viewer";
}

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

  // Temporary: one-tap entry with no email/password. Requires "Allow
  // anonymous sign-ins" in Supabase → Authentication → Sign In / Providers.
  async function enter() {
    if (!isSupabaseConfigured) return { error: "Supabase is not configured yet." };
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) return { error: error.message };
    await supabase.rpc("claim_editor");
    await refreshRole(data.user);
    return { error: null };
  }

  // Read-only entry from a share link created in Settings > Viewer Access.
  async function enterAsViewer(token: string) {
    if (!isSupabaseConfigured) return { error: "Supabase is not configured yet." };
    let current = user;
    if (!current) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) return { error: error.message };
      current = data.user;
    }
    const { data: ok, error } = await supabase.rpc("claim_viewer", { p_token: token });
    if (error || !ok) {
      await supabase.auth.signOut();
      return { error: "This viewer link is invalid or has been turned off." };
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
        enter,
        enterAsViewer,
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
