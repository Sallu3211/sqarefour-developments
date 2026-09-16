"use client";

import clsx from "clsx";
import type { EntryType } from "@/lib/types";
import { ENTRY_TYPE_LABELS, ENTRY_TYPE_STYLES } from "@/lib/constants";

const TYPES: EntryType[] = ["purchase", "labour", "other"];

export function EntryTypeToggle({
  value,
  onChange,
}: {
  value: EntryType;
  onChange: (t: EntryType) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TYPES.map((t) => {
        const style = ENTRY_TYPE_STYLES[t];
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={clsx(
              "rounded-xl px-2 py-3 text-center text-xs font-bold ring-1 ring-inset transition",
              active ? `${style.bg} ${style.text} ${style.ring}` : "bg-white text-slate-400 ring-slate-200"
            )}
          >
            {ENTRY_TYPE_LABELS[t]}
          </button>
        );
      })}
    </div>
  );
}
