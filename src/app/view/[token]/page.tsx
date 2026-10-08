"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, Spinner } from "@/components/ui/Primitives";

// Landing page for a view-only share link (created in Settings > Viewer
// Access). Signs the visitor in as a read-only viewer, then opens the app.
export default function ViewerLinkPage() {
  const { token } = useParams<{ token: string }>();
  const { loading, enterAsViewer } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (loading || started.current) return;
    started.current = true;
    enterAsViewer(token).then(({ error }) => {
      if (error) setError(error);
      else router.replace("/dashboard");
    });
  }, [loading, token, enterAsViewer, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <Card className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="Squarefour Developments" className="h-14 w-14 rounded-xl object-cover" />
        <div>
          <h1 className="text-lg font-bold text-slate-900">Squarefour Developments</h1>
          <p className="text-sm text-slate-500">View-only access</p>
        </div>
        {error ? (
          <>
            <p className="text-sm font-medium text-red-600">{error}</p>
            <Link href="/" className="text-sm font-semibold text-amber-600">
              Go to home page
            </Link>
          </>
        ) : (
          <Spinner className="h-6 w-6 text-amber-500" />
        )}
      </Card>
    </div>
  );
}
