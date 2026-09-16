import { isSupabaseConfigured, supabase } from "./supabase/client";

export interface DraftPayload<T> {
  data: T;
  savedAt: string;
}

function storageKey(key: string) {
  return `squarefour:draft:${key}`;
}

export function loadLocalDraft<T>(key: string): DraftPayload<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return null;
    return JSON.parse(raw) as DraftPayload<T>;
  } catch {
    return null;
  }
}

export function saveLocalDraft<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    const payload: DraftPayload<T> = { data, savedAt: new Date().toISOString() };
    window.localStorage.setItem(storageKey(key), JSON.stringify(payload));
  } catch {
    // storage full or unavailable — local autosave is best-effort only
  }
}

export function clearLocalDraft(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(key));
  } catch {
    // ignore
  }
}

/** Best-effort remote backup so a draft survives a cleared browser/new device. */
export async function pushRemoteDraft<T>(key: string, formType: string, data: T) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from("drafts").upsert({
      id: key,
      form_type: formType,
      payload_json: data,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // non-blocking — local draft already covers the common case
  }
}

export async function fetchRemoteDraft<T>(key: string): Promise<DraftPayload<T> | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase
      .from("drafts")
      .select("payload_json, updated_at")
      .eq("id", key)
      .maybeSingle();
    if (!data) return null;
    return { data: data.payload_json as T, savedAt: data.updated_at as string };
  } catch {
    return null;
  }
}

export async function clearRemoteDraft(key: string) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from("drafts").delete().eq("id", key);
  } catch {
    // ignore
  }
}
