"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSites } from "@/context/SiteContext";
import { supabase } from "@/lib/supabase/client";
import { formatMoney, todayISO, weekRange } from "@/lib/format";
import type { EntryWithRelations } from "@/lib/types";
import { Card, EmptyState, Spinner } from "@/components/ui/Primitives";
import { ENTRY_TYPE_STYLES } from "@/lib/constants";
import { EntryRow } from "@/components/entries/EntryRow";
import { EditEntryModal } from "@/components/entries/EditEntryModal";
import { IconList, IconPlus, IconReceipt, IconUsers } from "@/components/layout/NavIcons";

const QUICK_ACTIONS = [
  { href: "/entries/new?type=purchase", label: "Add Purchase", icon: IconPlus, style: ENTRY_TYPE_STYLES.purchase },
  { href: "/entries/new?type=labour", label: "Add Labour / Mason", icon: IconUsers, style: ENTRY_TYPE_STYLES.labour },
  { href: "/entries/new?type=other", label: "Add Other Expense", icon: IconReceipt, style: ENTRY_TYPE_STYLES.other },
  { href: "/bill", label: "View / Print Bill", icon: IconList, style: { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200", dot: "" } },
];

export default function DashboardPage() {
  const { selectedSite, selectedSiteId, loading: sitesLoading } = useSites();
  const [loading, setLoading] = useState(true);
  const [todayTotal, setTodayTotal] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);
  const [recent, setRecent] = useState<EntryWithRelations[]>([]);
  const [editingEntry, setEditingEntry] = useState<EntryWithRelations | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!selectedSiteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      const today = todayISO();
      const { start } = weekRange();

      const [todayRes, weekRes, recentRes] = await Promise.all([
        supabase
          .from("entries")
          .select("amount")
          .eq("site_id", selectedSiteId)
          .is("deleted_at", null)
          .eq("entry_date", today),
        supabase
          .from("entries")
          .select("amount")
          .eq("site_id", selectedSiteId)
          .is("deleted_at", null)
          .gte("entry_date", start)
          .lte("entry_date", today),
        supabase
          .from("entries")
          .select("*, category:categories(*), worker:workers(*)")
          .eq("site_id", selectedSiteId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      if (cancelled) return;
      setTodayTotal((todayRes.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setWeekTotal((weekRes.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setRecent((recentRes.data as EntryWithRelations[]) || []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedSiteId, refreshKey]);

  if (sitesLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-amber-500" />
      </div>
    );
  }

  if (!selectedSiteId) {
    return (
      <EmptyState
        title="Add your first construction site"
        description="Use the site picker at the top to add a site — then you can start logging purchases and labour payments."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{selectedSite?.name}</h1>
        <p className="text-sm text-slate-500">Here&apos;s what&apos;s happening on this site</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Today</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(todayTotal)}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">This Week</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(weekTotal)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`flex flex-col items-start gap-3 rounded-2xl p-4 ring-1 ring-inset transition active:scale-[0.98] ${a.style.bg} ${a.style.ring}`}
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white ${a.style.text}`}>
              <a.icon className="h-5 w-5" />
            </span>
            <span className={`text-sm font-semibold ${a.style.text}`}>{a.label}</span>
          </Link>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">Recent Activity</h2>
          <Link href="/ledger" className="text-sm font-semibold text-amber-600">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-5 w-5 text-amber-500" />
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            title="No entries yet"
            description="Tap one of the buttons above to log your first purchase or payment."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((e) => (
              <EntryRow key={e.id} entry={e} onClick={() => setEditingEntry(e)} />
            ))}
          </div>
        )}
      </div>

      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => {
            setEditingEntry(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
