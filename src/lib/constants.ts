import type { EntryType } from "./types";

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  purchase: "Purchase",
  labour: "Labour / Mason",
  other: "Other Expense",
};

export const ENTRY_TYPE_STYLES: Record<
  EntryType,
  { bg: string; text: string; ring: string; dot: string }
> = {
  purchase: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
    dot: "bg-blue-500",
  },
  labour: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
  },
  other: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    ring: "ring-violet-200",
    dot: "bg-violet-500",
  },
};

export const WORKER_ROLES = ["Labour", "Mason", "Supervisor", "Other"];
