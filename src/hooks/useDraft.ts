"use client";

import { useEffect, useRef, useState } from "react";
import {
  clearLocalDraft,
  clearRemoteDraft,
  loadLocalDraft,
  pushRemoteDraft,
  saveLocalDraft,
} from "@/lib/autosave";

/**
 * Autosaves `data` to localStorage (debounced) and to Supabase (periodic,
 * best-effort) under `key`. On first mount it surfaces any existing draft so
 * the caller can offer a "Restore unsaved entry?" prompt before it's lost.
 */
export function useDraft<T>(key: string, formType: string, data: T, enabled = true) {
  const [recoverable, setRecoverable] = useState<{ data: T; savedAt: string } | null>(null);
  const [checked, setChecked] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // One-time check for a recoverable draft on mount.
  useEffect(() => {
    if (!enabled) {
      setChecked(true);
      return;
    }
    const local = loadLocalDraft<T>(key);
    if (local) {
      setRecoverable(local);
    }
    setChecked(true);
  }, [key, enabled]);

  // Debounced local autosave + periodic remote backup.
  useEffect(() => {
    if (!enabled || !checked) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveLocalDraft(key, data);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), enabled, checked, key]);

  useEffect(() => {
    if (!enabled) return;
    remoteIntervalRef.current = setInterval(() => {
      pushRemoteDraft(key, formType, data);
    }, 15000);
    return () => {
      if (remoteIntervalRef.current) clearInterval(remoteIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), enabled, key, formType]);

  function dismissRecovered() {
    setRecoverable(null);
  }

  function clearDraft() {
    clearLocalDraft(key);
    clearRemoteDraft(key);
    setRecoverable(null);
  }

  return { recoverable, checked, dismissRecovered, clearDraft };
}
