"use client";

import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export interface Branding {
  logoUrl: string | null;
  companyName: string;
}

const DEFAULT_BRANDING: Branding = {
  logoUrl: null,
  companyName: "Squarefour Developments",
};

export function useBranding() {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("app_settings").select("value").eq("key", "branding").maybeSingle();
    if (data?.value) setBranding({ ...DEFAULT_BRANDING, ...(data.value as Partial<Branding>) });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function update(next: Partial<Branding>) {
    const merged = { ...branding, ...next };
    setBranding(merged);
    await supabase.from("app_settings").upsert({
      key: "branding",
      value: merged,
      updated_at: new Date().toISOString(),
    });
  }

  async function uploadLogo(file: File): Promise<string | null> {
    const path = `logo-${Date.now()}.${file.name.split(".").pop() || "png"}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) return null;
    const url = supabase.storage.from("branding").getPublicUrl(path).data.publicUrl;
    await update({ logoUrl: url });
    return url;
  }

  return { branding, loading, update, uploadLogo, refresh };
}
