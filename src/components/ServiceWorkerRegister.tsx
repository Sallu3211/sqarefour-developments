"use client";

import { useEffect } from "react";

/** Registers the no-op service worker so Chrome treats the app as installable. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal: worst case, Android install falls back to a plain shortcut.
      });
    }
  }, []);

  return null;
}
