"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "./Primitives";

export interface SelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Search...",
  onCreate,
  creating = false,
  disabled = false,
  emptyLabel = "No results",
}: {
  value: string | null;
  onChange: (id: string) => void;
  options: SelectOption[];
  placeholder?: string;
  onCreate?: (name: string) => void | Promise<void>;
  creating?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.sublabel?.toLowerCase().includes(q)
    );
  }, [options, query]);

  const exactMatch = filtered.some(
    (o) => o.label.toLowerCase() === query.trim().toLowerCase()
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openPanel() {
    if (disabled) return;
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  async function handleCreate() {
    if (!onCreate || !query.trim()) return;
    await onCreate(query.trim());
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={clsx(
          "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200",
          disabled && "opacity-50"
        )}
      >
        <span className={clsx(selected ? "text-slate-900" : "text-slate-400")}>
          {selected ? selected.label : placeholder}
        </span>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="shrink-0 text-slate-400">
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search..."
              className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm focus:outline-none"
              inputMode="search"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && !onCreate && (
              <p className="px-3 py-3 text-sm text-slate-400">{emptyLabel}</p>
            )}
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => pick(o.id)}
                className={clsx(
                  "flex w-full flex-col px-3.5 py-2.5 text-left text-sm hover:bg-amber-50",
                  o.id === value && "bg-amber-50"
                )}
              >
                <span className="font-medium text-slate-800">{o.label}</span>
                {o.sublabel && <span className="text-xs text-slate-400">{o.sublabel}</span>}
              </button>
            ))}
            {onCreate && query.trim() && !exactMatch && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-3.5 py-2.5 text-left text-sm font-semibold text-amber-700 hover:bg-amber-50"
              >
                {creating ? <Spinner className="h-4 w-4" /> : <span>+</span>}
                Add &quot;{query.trim()}&quot;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
