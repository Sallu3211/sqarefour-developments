import { forwardRef } from "react";
import { formatDateTime, formatEntryDate, formatMoney } from "@/lib/format";
import { ENTRY_TYPE_LABELS } from "@/lib/constants";
import type { EntryType, EntryWithRelations, Site } from "@/lib/types";
import { Logo } from "@/components/ui/Logo";

const GROUP_ORDER: EntryType[] = ["purchase", "labour", "other"];

function lineLabel(e: EntryWithRelations) {
  if (e.type === "labour") return e.worker?.name || "Worker";
  return e.category?.name || ENTRY_TYPE_LABELS[e.type];
}

export const BillTemplate = forwardRef<
  HTMLDivElement,
  {
    site: Site | null;
    periodLabel: string;
    entries: EntryWithRelations[];
    logoUrl?: string | null;
    companyName?: string;
  }
>(function BillTemplate({ site, periodLabel, entries, logoUrl, companyName = "Squarefour Developments" }, ref) {
  const grandTotal = entries.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div ref={ref} className="w-full bg-white p-6 text-slate-900 sm:p-8" style={{ minWidth: 320 }}>
      <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={companyName} className="h-12 w-12 rounded-xl object-contain" />
          ) : (
            <Logo size={48} />
          )}
          <div>
            <p className="text-lg font-black leading-tight">{companyName}</p>
            <p className="text-xs text-slate-500">Site Finance &amp; Billing Statement</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-base font-bold">{site?.name || "—"}</p>
          <p className="text-xs text-slate-500">{periodLabel}</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No entries in this period.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {GROUP_ORDER.map((type) => {
            const rows = entries.filter((e) => e.type === type);
            if (rows.length === 0) return null;
            const subtotal = rows.reduce((s, e) => s + Number(e.amount), 0);
            return (
              <div key={type}>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {ENTRY_TYPE_LABELS[type]}
                </p>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                      <th className="py-1.5 font-medium">Date</th>
                      <th className="py-1.5 font-medium">{type === "labour" ? "Worker" : "Category"}</th>
                      <th className="py-1.5 font-medium">Description</th>
                      <th className="py-1.5 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100">
                        <td className="whitespace-nowrap py-1.5 pr-2 text-slate-500">
                          {formatEntryDate(e.entry_date, e.entry_date_end)}
                        </td>
                        <td className="py-1.5 pr-2 font-medium">{lineLabel(e)}</td>
                        <td className="py-1.5 pr-2 text-slate-500">{e.description || "—"}</td>
                        <td className="py-1.5 text-right font-semibold">{formatMoney(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-1 flex justify-end gap-4 text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold">{formatMoney(subtotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
        <span className="text-sm font-semibold uppercase tracking-wide">Grand Total</span>
        <span className="text-xl font-black">{formatMoney(grandTotal)}</span>
      </div>

      <p className="mt-4 text-center text-[11px] text-slate-400">
        Generated {formatDateTime(new Date().toISOString())} · {companyName}
      </p>
    </div>
  );
});
