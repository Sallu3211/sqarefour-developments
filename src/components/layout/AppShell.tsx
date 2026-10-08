"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSites } from "@/context/SiteContext";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Spinner } from "@/components/ui/Primitives";
import {
  IconHome,
  IconList,
  IconLogout,
  IconPlus,
  IconReceipt,
  IconSettings,
  IconUsers,
} from "./NavIcons";

const NAV = [
  { href: "/dashboard", label: "Home", icon: IconHome, editorOnly: false },
  { href: "/entries/new", label: "Add", icon: IconPlus, editorOnly: true },
  { href: "/ledger", label: "Ledger", icon: IconList, editorOnly: false },
  { href: "/workers", label: "Workers", icon: IconUsers, editorOnly: false },
  { href: "/bill", label: "Bill", icon: IconReceipt, editorOnly: false },
];

// Pages a read-only viewer is sent away from.
const EDITOR_ONLY_PATHS = ["/entries", "/settings"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, loading, isViewer, signOut } = useAuth();
  const { sites, selectedSiteId, setSelectedSiteId, addSite, loading: sitesLoading } = useSites();
  const router = useRouter();
  const pathname = usePathname();
  const [creatingSite, setCreatingSite] = useState(false);

  useEffect(() => {
    if (!loading && isSupabaseConfigured && !role) {
      router.replace("/");
    }
  }, [loading, role, router]);

  const blocked = isViewer && EDITOR_ONLY_PATHS.some((p) => pathname.startsWith(p));
  useEffect(() => {
    if (blocked) router.replace("/dashboard");
  }, [blocked, router]);

  const nav = NAV.filter((item) => !(isViewer && item.editorOnly));
  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
  const onCreateSite = isViewer
    ? undefined
    : async (name: string) => {
        setCreatingSite(true);
        const site = await addSite(name);
        setCreatingSite(false);
        if (site) setSelectedSiteId(site.id);
      };

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

  if (loading || !role || blocked) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="h-8 w-8 text-amber-500" />
      </div>
    );
  }

  const siteOptions = sites.map((s) => ({ id: s.id, label: s.name, sublabel: s.code || undefined }));

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
          <BrandLogo size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">Squarefour Developments</p>
            <p className="truncate text-xs text-slate-400">Site finance &amp; billing</p>
          </div>
          {isViewer && (
            <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
              View only
            </span>
          )}
          {!isViewer && (
            <Link
              href="/settings"
              className={`shrink-0 rounded-lg p-2.5 hover:bg-slate-100 ${
                pathname.startsWith("/settings") ? "bg-amber-100 text-amber-700" : "text-slate-500"
              }`}
              aria-label="Settings"
            >
              <IconSettings className="h-5 w-5" />
            </Link>
          )}
          <button
            onClick={() => signOut()}
            className="shrink-0 rounded-lg p-2.5 text-slate-500 hover:bg-slate-100"
            aria-label="Sign out"
          >
            <IconLogout className="h-5 w-5" />
          </button>
        </div>
        <nav className="hidden border-t border-slate-100 sm:block">
          <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-6 pt-2">
            {nav.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                    active ? "bg-amber-100 text-amber-700" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="mx-auto max-w-5xl px-3 pb-2.5 pt-2 sm:px-6 sm:pb-3">
          {sitesLoading ? (
            <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <SearchableSelect
              value={sites.length === 0 ? null : selectedSiteId}
              onChange={sites.length === 0 ? () => {} : setSelectedSiteId}
              options={siteOptions}
              placeholder={
                sites.length === 0
                  ? isViewer
                    ? "No sites yet"
                    : "Add your first construction site..."
                  : "Select a construction site..."
              }
              creating={creatingSite}
              onCreate={onCreateSite}
            />
          )}
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-3 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pb-10 sm:pt-6">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 [transform:translateZ(0)] border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom,0px)] sm:hidden">
        <div className="mx-auto flex max-w-5xl">
          {nav.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  active ? "text-amber-600" : "text-slate-400"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    active ? "bg-amber-100" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
