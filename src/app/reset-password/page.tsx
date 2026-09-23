"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { Button, Card, Field } from "@/components/ui/Primitives";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Logo } from "@/components/ui/Logo";
import { Spinner } from "@/components/ui/Primitives";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    // The reset link puts Supabase into a temporary "password recovery"
    // session automatically — this just waits for that to be established.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace("/dashboard"), 1500);
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <Logo size={56} />
        <p className="text-sm text-slate-500">Supabase isn&apos;t configured yet.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Squarefour Developments" className="h-14 w-14 rounded-xl object-cover" />
          <h1 className="text-lg font-bold text-slate-900">Set a New Password</h1>
        </div>

        {done ? (
          <p className="text-center text-sm font-medium text-emerald-600">
            Password updated — taking you to the dashboard...
          </p>
        ) : !ready ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Spinner className="h-6 w-6 text-amber-500" />
            <p className="text-center text-sm text-slate-500">
              Verifying your reset link... if this doesn&apos;t finish, the link may have expired —
              request a new one from the sign-in page.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="New Password">
              <PasswordInput
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Confirm New Password">
              <PasswordInput
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? "Saving..." : "Save New Password"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
