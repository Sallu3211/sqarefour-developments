"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";
import type { EntryWithRelations, Worker } from "@/lib/types";
import { PeriodFilter, periodFor, type PeriodValue } from "@/components/filters/PeriodFilter";
import { EntryRow } from "@/components/entries/EntryRow";
import { Card, EmptyState, Spinner } from "@/components/ui/Primitives";

export default function WorkerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [entries, setEntries] = useState<EntryWithRelations[]>([]);
  const [period, setPeriod] = useState<PeriodValue>(periodFor("monthly"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [workerRes, entriesRes] = await Promise.all([
        supabase.from("workers").select("*").eq("id", params.id).single(),
        supabase
          .from("entries")
          .select("*, category:categories(*), worker:workers(*)")
          .eq("worker_id", params.id)
          .is("deleted_at", null)
          .gte("entry_date", period.start)
          .lte("entry_date", period.end)
          .order("entry_date", { ascending: false }),
      ]);
      if (cancelled) return;
      setWorker(workerRes.data as Worker);
      setEntries((entriesRes.data as EntryWithRelations[]) || []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [params.id, period.start, period.end]);

  const total = entries.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => router.push("/workers")} className="text-sm font-semibold text-slate-500">
        ← All workers
      </button>

      {loading && !worker ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6 text-amber-500" />
        </div>
      ) : worker ? (
        <>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{worker.name}</h1>
            <p className="text-sm text-slate-500">{worker.role}{worker.phone ? ` · ${worker.phone}` : ""}</p>
          </div>

          <PeriodFilter value={period} onChange={setPeriod} />

          <Card className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Total Paid</span>
            <span className="text-2xl font-bold text-slate-900">{formatMoney(total)}</span>
          </Card>

          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-5 w-5 text-amber-500" />
            </div>
          ) : entries.length === 0 ? (
            <EmptyState title="No payments in this period" />
          ) : (
            <div className="flex flex-col gap-2">
              {entries.map((e) => (
                <EntryRow key={e.id} entry={e} />
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState title="Worker not found" />
      )}
    </div>
  );
}
