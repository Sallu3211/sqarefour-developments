"use client";

import clsx from "clsx";
import { dayRange, monthRange, todayISO, weekRange, yearRange } from "@/lib/format";
import type { PeriodType } from "@/lib/types";
import { Input } from "@/components/ui/Primitives";

export interface PeriodValue {
  type: PeriodType;
  start: string;
  end: string;
}

const OPTIONS: { type: PeriodType; label: string }[] = [
  { type: "daily", label: "Today" },
  { type: "weekly", label: "This Week" },
  { type: "monthly", label: "This Month" },
  { type: "yearly", label: "This Year" },
  { type: "custom", label: "Custom" },
];

export function periodFor(type: PeriodType): PeriodValue {
  if (type === "daily") return { type, ...dayRange() };
  if (type === "weekly") return { type, ...weekRange() };
  if (type === "monthly") return { type, ...monthRange() };
  if (type === "yearly") return { type, ...yearRange() };
  return { type, start: todayISO(), end: todayISO() };
}

export function PeriodFilter({
  value,
  onChange,
}: {
  value: PeriodValue;
  onChange: (v: PeriodValue) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {OPTIONS.map((o) => (
          <button
            key={o.type}
            type="button"
            onClick={() => onChange(periodFor(o.type))}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
              value.type === o.type
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value.type === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={value.start}
            max={value.end}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
          />
          <span className="text-slate-400">to</span>
          <Input
            type="date"
            value={value.end}
            min={value.start}
            max={todayISO()}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
