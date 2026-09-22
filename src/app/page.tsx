"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/Primitives";
import { Logo } from "@/components/ui/Logo";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (loading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [loading, user, router]);

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

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="h-8 w-8 text-amber-500" />
    </div>
  );
}
