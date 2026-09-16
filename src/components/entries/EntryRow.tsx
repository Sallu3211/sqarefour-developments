"use client";

import clsx from "clsx";
import { formatDate, formatMoney } from "@/lib/format";
import { ENTRY_TYPE_LABELS, ENTRY_TYPE_STYLES } from "@/lib/constants";
import type { EntryWithRelations } from "@/lib/types";

export function EntryRow({
  entry,
  onClick,
}: {
  entry: EntryWithRelations;
  onClick?: () => void;
}) {
  const style = ENTRY_TYPE_STYLES[entry.type];
  const title =
    entry.type === "labour"
      ? entry.worker?.name || "Worker"
      : entry.category?.name || ENTRY_TYPE_LABELS[entry.type];

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition",
        onClick && "hover:border-amber-200 hover:bg-amber-50/40"
      )}
    >
      <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", style.dot)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
        <p className="truncate text-xs text-slate-400">
          {entry.description || ENTRY_TYPE_LABELS[entry.type]} · {formatDate(entry.entry_date)}
        </p>
      </div>
      <p className="shrink-0 text-sm font-bold text-slate-900">{formatMoney(entry.amount)}</p>
    </button>
  );
}
