"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { useAuth } from "./AuthContext";
import type { Site } from "@/lib/types";

const LAST_SITE_KEY = "squarefour:last-site-id";

interface SiteContextValue {
  sites: Site[];
  loading: boolean;
  selectedSiteId: string | null;
  selectedSite: Site | null;
  setSelectedSiteId: (id: string | null) => void;
  refresh: () => Promise<void>;
  addSite: (name: string) => Promise<Site | null>;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteIdState] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("sites")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });
    setSites((data as Site[]) || []);
    setLoading(false);
  }, []);

  // Wait for auth to resolve before querying: sites are RLS-protected, so
  // fetching before the session is attached (e.g. on first load of a fresh
  // device/browser, right as the login form is still showing) silently
  // returns zero rows and nothing ever re-triggers the fetch afterward —
  // making a real site look like it vanished. Re-running this whenever
  // `user` flips from null to a real session (right after login, or once a
  // persisted session resolves on reload) fixes that for good.
  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [user, authLoading, refresh]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(LAST_SITE_KEY);
      if (stored) setSelectedSiteIdState(stored);
    }
  }, []);

  // If the previously selected site disappears, fall back to the first one.
  useEffect(() => {
    if (loading) return;
    if (sites.length === 0) return;
    if (!selectedSiteId || !sites.some((s) => s.id === selectedSiteId)) {
      setSelectedSiteIdState(sites[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sites]);

  function setSelectedSiteId(id: string | null) {
    setSelectedSiteIdState(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(LAST_SITE_KEY, id);
      else window.localStorage.removeItem(LAST_SITE_KEY);
    }
  }

  async function addSite(name: string): Promise<Site | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from("sites")
      .insert({ name })
      .select()
      .single();
    if (error || !data) return null;
    await refresh();
    return data as Site;
  }

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || null;

  return (
    <SiteContext.Provider
      value={{ sites, loading, selectedSiteId, selectedSite, setSelectedSiteId, refresh, addSite }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSites() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSites must be used within SiteProvider");
  return ctx;
}
