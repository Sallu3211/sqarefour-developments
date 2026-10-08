"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Button, Card, Spinner } from "@/components/ui/Primitives";
import { Logo } from "@/components/ui/Logo";

export default function Home() {
  const { user, loading, enter } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function handleEnter() {
    setError(null);
    setSubmitting(true);
    const { error } = await enter();
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    router.replace("/dashboard");
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <Logo size={56} />
        <h1 className="text-xl font-bold text-slate-900">Almost there</h1>
        <p className="text-sm text-slate-500">
          Squarefour Developments isn&apos;t connected to a database yet. Add your Supabase
          project URL and anon key to <code className="rounded bg-slate-100 px-1.5 py-0.5">.env.local</code>{" "}
          (see the README) and restart the app.
        </p>
      </div>
    );
  }

  if (loading || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="h-8 w-8 text-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Squarefour Developments" className="h-14 w-14 rounded-xl object-cover" />
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900">Squarefour Developments</h1>
            <p className="text-sm text-slate-500">Site finance &amp; billing</p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <Button type="button" size="lg" disabled={submitting} onClick={handleEnter} className="w-full">
            {submitting ? "Logging in..." : "Login"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
