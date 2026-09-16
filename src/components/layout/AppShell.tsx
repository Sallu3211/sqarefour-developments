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
  { href: "/dashboard", label: "Home", icon: IconHome },
  { href: "/entries/new", label: "Add", icon: IconPlus },
  { href: "/ledger", label: "Ledger", icon: IconList },
  { href: "/workers", label: "Workers", icon: IconUsers },
  { href: "/bill", label: "Bill", icon: IconReceipt },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const { sites, selectedSiteId, setSelectedSiteId, addSite, loading: sitesLoading } = useSites();
  const router = useRouter();
  const pathname = usePathname();
  const [creatingSite, setCreatingSite] = useState(false);

  useEffect(() => {
    if (!loading && isSupabaseConfigured && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
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

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <BrandLogo size={38} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">Squarefour Developments</p>
            <p className="truncate text-xs text-slate-400">Site finance &amp; billing</p>
          </div>
          <Link
            href="/settings"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Settings"
          >
            <IconSettings className="h-5 w-5" />
          </Link>
          <button
            onClick={() => signOut()}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Sign out"
          >
            <IconLogout className="h-5 w-5" />
          </button>
        </div>
        <div className="hidden gap-1 border-t border-slate-100 px-4 pt-2 sm:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  active ? "bg-amber-100 text-amber-700" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="mx-auto max-w-4xl px-4 pb-3 pt-2">
          {sitesLoading ? (
            <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
          ) : sites.length === 0 ? (
            <SearchableSelect
              value={null}
              onChange={() => {}}
              options={[]}
              placeholder="Add your first construction site..."
              creating={creatingSite}
              onCreate={async (name) => {
                setCreatingSite(true);
                const site = await addSite(name);
                setCreatingSite(false);
                if (site) setSelectedSiteId(site.id);
              }}
            />
          ) : (
            <SearchableSelect
              value={selectedSiteId}
              onChange={setSelectedSiteId}
              options={sites.map((s) => ({ id: s.id, label: s.name, sublabel: s.code || undefined }))}
              placeholder="Select a construction site..."
              creating={creatingSite}
              onCreate={async (name) => {
                setCreatingSite(true);
                const site = await addSite(name);
                setCreatingSite(false);
                if (site) setSelectedSiteId(site.id);
              }}
            />
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-24 pt-4 sm:pb-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom,0px)] sm:hidden">
        <div className="mx-auto flex max-w-4xl">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                  active ? "text-amber-600" : "text-slate-400"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    active ? "bg-amber-100" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
