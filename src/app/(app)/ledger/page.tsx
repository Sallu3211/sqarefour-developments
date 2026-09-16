"use client";

import { useEffect, useState } from "react";
import { useSites } from "@/context/SiteContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";
import { ENTRY_TYPE_LABELS } from "@/lib/constants";
import type { EntryType, EntryWithRelations } from "@/lib/types";
import { PeriodFilter, periodFor, type PeriodValue } from "@/components/filters/PeriodFilter";
import { EntryRow } from "@/components/entries/EntryRow";
import { Card, EmptyState, Input, Spinner } from "@/components/ui/Primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import clsx from "clsx";

const TYPE_FILTERS: { value: EntryType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "purchase", label: "Purchases" },
  { value: "labour", label: "Labour / Mason" },
  { value: "other", label: "Other" },
];

export default function LedgerPage() {
  const { selectedSiteId } = useSites();
  const { show } = useToast();
  const [period, setPeriod] = useState<PeriodValue>(periodFor("weekly"));
  const [typeFilter, setTypeFilter] = useState<EntryType | "all">("all");
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<EntryWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<EntryWithRelations | null>(null);

  async function load() {
    if (!selectedSiteId) return;
    setLoading(true);
    const { data } = await supabase
      .from("entries")
      .select("*, category:categories(*), worker:workers(*)")
      .eq("site_id", selectedSiteId)
      .is("deleted_at", null)
      .gte("entry_date", period.start)
      .lte("entry_date", period.end)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    setEntries((data as EntryWithRelations[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, period.start, period.end]);

  const filtered = entries.filter((e) => {
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      e.description?.toLowerCase().includes(q) ||
      e.category?.name.toLowerCase().includes(q) ||
      e.worker?.name.toLowerCase().includes(q)
    );
  });

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const entry = pendingDelete;
    setPendingDelete(null);
    setEntries((list) => list.filter((e) => e.id !== entry.id));
    await supabase.from("entries").update({ deleted_at: new Date().toISOString() }).eq("id", entry.id);
    show("Entry deleted", "info", {
      label: "Undo",
      onClick: async () => {
        await supabase.from("entries").update({ deleted_at: null }).eq("id", entry.id);
        load();
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Site Ledger</h1>

      <PeriodFilter value={period} onChange={setPeriod} />

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search description, category, or worker..."
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold",
              typeFilter === f.value ? "bg-amber-500 text-slate-900" : "bg-slate-100 text-slate-600"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        </span>
        <span className="text-lg font-bold text-slate-900">{formatMoney(total)}</span>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6 text-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No entries found" description="Try a different date range or filter." />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((e) => (
            <div key={e.id} className="flex items-center gap-2">
              <div className="flex-1">
                <EntryRow entry={e} />
              </div>
              <button
                onClick={() => setPendingDelete(e)}
                aria-label="Delete entry"
                className="shrink-0 rounded-xl border border-slate-200 bg-white p-3 text-red-500 hover:border-red-200 hover:bg-red-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-.8 12.1A2 2 0 0 1 16.2 21H7.8a2 2 0 0 1-2-1.9L5 7h14Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this entry?"
        description={pendingDelete ? `${ENTRY_TYPE_LABELS[pendingDelete.type]} · ${formatMoney(pendingDelete.amount)}` : undefined}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
