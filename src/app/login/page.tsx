"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Button, Card, Field, Input } from "@/components/ui/Primitives";
import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  const { user, loading, signIn, requestPasswordReset } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    router.replace("/dashboard");
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await requestPasswordReset(email.trim());
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    setResetSent(true);
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <Logo size={56} />
        <h1 className="text-xl font-bold text-slate-900">Almost there</h1>
        <p className="text-sm text-slate-500">
          Add your Supabase project URL and anon key to <code className="rounded bg-slate-100 px-1.5 py-0.5">.env.local</code> to enable sign in.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          {/* Static bundled asset, not the Supabase-hosted one: the login
              screen renders before authentication, and branding data is
              RLS-protected (requires a session to read). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Squarefour Developments" className="h-14 w-14 rounded-xl object-cover" />
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900">Squarefour Developments</h1>
            <p className="text-sm text-slate-500">Site finance &amp; billing</p>
          </div>
        </div>
        {mode === "signin" ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Email">
              <Input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="office@squarefour.com"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode("reset");
                setError(null);
                setResetSent(false);
              }}
              className="text-center text-sm font-semibold text-slate-500"
            >
              Forgot password?
            </button>
          </form>
        ) : resetSent ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-slate-600">
              If an account exists for <span className="font-semibold">{email}</span>, a password reset
              link has been sent — check that inbox.
            </p>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-sm font-semibold text-amber-600"
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="flex flex-col gap-4">
            <p className="text-sm text-slate-500">
              Enter the shared team email and we&apos;ll send a link to set a new password.
            </p>
            <Field label="Email">
              <Input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="office@squarefour.com"
              />
            </Field>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? "Sending..." : "Send Reset Link"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className="text-center text-sm font-semibold text-slate-500"
            >
              ← Back to sign in
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
