"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type Role } from "@/context/AuthContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { Button, Card, Spinner } from "@/components/ui/Primitives";
import { Logo } from "@/components/ui/Logo";

interface PinStatus {
  ready: boolean; // supabase/viewer-access.sql has been run
  editorPin: boolean;
  viewerPin: boolean;
}

export default function Home() {
  const { role, loading, loginWithPin } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<PinStatus | null>(null);
  const [mode, setMode] = useState<Role | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!loading && role) router.replace("/dashboard");
  }, [loading, role, router]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.rpc("pin_status").then(({ data, error }) => {
      const row = Array.isArray(data) ? data[0] : data;
      setStatus(
        error || !row
          ? { ready: false, editorPin: false, viewerPin: false }
          : { ready: true, editorPin: !!row.editor_pin, viewerPin: !!row.viewer_pin }
      );
    });
  }, []);

  async function submit(asRole: Role, value: string | null) {
    setError(null);
    setSubmitting(true);
    const { error } = await loginWithPin(asRole, value);
    setSubmitting(false);
    if (error) {
      setError(error);
      setPin("");
      pinRef.current?.focus();
      return;
    }
    router.replace("/dashboard");
  }

  function choose(asRole: Role) {
    setError(null);
    setPin("");
    if (asRole === "editor" && !status?.editorPin) {
      submit("editor", null);
      return;
    }
    if (asRole === "viewer" && !status?.viewerPin) {
      setError("Viewer login isn't set up yet. Ask the owner for access.");
      return;
    }
    setMode(asRole);
    setTimeout(() => pinRef.current?.focus(), 0);
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

  if (loading || role || !status) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="h-8 w-8 text-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Squarefour Developments" className="h-14 w-14 rounded-xl object-cover" />
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900">Squarefour Developments</h1>
            <p className="text-sm text-slate-500">Site finance &amp; billing</p>
          </div>
        </div>

        {mode ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pin.length >= 4) submit(mode, pin);
            }}
            className="flex flex-col gap-4"
          >
            <p className="text-center text-sm font-semibold text-slate-700">
              {mode === "viewer" ? "Enter viewer PIN" : "Enter owner PIN"}
            </p>
            <input
              ref={pinRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••"
              aria-label="PIN"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 placeholder:text-slate-300 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" size="lg" disabled={submitting || pin.length < 4} className="w-full">
              {submitting ? "Checking..." : "Login"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode(null);
                setError(null);
              }}
              className="py-1 text-center text-sm font-semibold text-slate-500"
            >
              ← Back
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}
            <Button type="button" size="lg" disabled={submitting} onClick={() => choose("editor")} className="w-full">
              {submitting ? "Logging in..." : "Login"}
            </Button>
            {status.ready && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={submitting}
                onClick={() => choose("viewer")}
                className="w-full"
              >
                Viewer Login
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
