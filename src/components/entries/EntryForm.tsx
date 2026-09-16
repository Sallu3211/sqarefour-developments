"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSites } from "@/context/SiteContext";
import { useToast } from "@/context/ToastContext";
import { useDraft } from "@/hooks/useDraft";
import { supabase } from "@/lib/supabase/client";
import { formatMoney, relativeTime, todayISO } from "@/lib/format";
import { ENTRY_TYPE_STYLES, WORKER_ROLES } from "@/lib/constants";
import type { Category, EntryType, Worker } from "@/lib/types";
import { Button, Card, Field, Input } from "@/components/ui/Primitives";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { EntryTypeToggle } from "./EntryTypeToggle";

interface LineShape {
  type: EntryType;
  entryDate: string;
  categoryId: string | null;
  workerId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

interface PendingItem extends LineShape {
  localId: string;
  categoryLabel: string | null;
  workerLabel: string | null;
  photo: File | null;
}

interface DraftShape {
  line: LineShape;
  items: PendingItem[];
}

function emptyLine(type: EntryType, entryDate: string): LineShape {
  return {
    type,
    entryDate,
    categoryId: null,
    workerId: null,
    description: "",
    quantity: "",
    unitPrice: "",
    amount: "",
  };
}

const DRAFT_KEY = "entry-form";

export function EntryForm({ initialType }: { initialType: EntryType }) {
  const { selectedSiteId, selectedSite } = useSites();
  const { show } = useToast();
  const router = useRouter();

  const [line, setLine] = useState<LineShape>(() => emptyLine(initialType, todayISO()));
  const [items, setItems] = useState<PendingItem[]>([]);
  const [amountTouched, setAmountTouched] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [creatingOption, setCreatingOption] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  const draftValue: DraftShape = { line, items };
  const draft = useDraft(DRAFT_KEY, "entry", draftValue, true);

  useEffect(() => {
    if (draft.checked && draft.recoverable) {
      const d = draft.recoverable.data;
      const hasLine = d.line?.description || d.line?.amount || d.line?.categoryId || d.line?.workerId;
      const hasItems = d.items && d.items.length > 0;
      if (!hasLine && !hasItems) {
        draft.dismissRecovered();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.checked]);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("type", line.type)
        .eq("is_active", true)
        .order("name");
      if (!cancelled) setCategories((data as Category[]) || []);
    }
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [line.type]);

  useEffect(() => {
    if (line.type !== "labour") return;
    let cancelled = false;
    async function loadWorkers() {
      const { data } = await supabase
        .from("workers")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (!cancelled) setWorkers((data as Worker[]) || []);
    }
    loadWorkers();
    return () => {
      cancelled = true;
    };
  }, [line.type]);

  const autoAmount = useMemo(() => {
    const q = parseFloat(line.quantity);
    const p = parseFloat(line.unitPrice);
    if (!isNaN(q) && !isNaN(p)) return (q * p).toString();
    return null;
  }, [line.quantity, line.unitPrice]);

  useEffect(() => {
    if (!amountTouched && autoAmount !== null) {
      setLine((f) => ({ ...f, amount: autoAmount }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAmount]);

  function update<K extends keyof LineShape>(key: K, value: LineShape[K]) {
    setLine((f) => ({ ...f, [key]: value }));
  }

  function restoreDraft() {
    if (draft.recoverable) {
      setLine(draft.recoverable.data.line);
      setItems(draft.recoverable.data.items || []);
      setAmountTouched(true);
    }
    draft.dismissRecovered();
  }

  function resetLine(keepType?: EntryType) {
    setLine((prev) => emptyLine(keepType ?? prev.type, prev.entryDate));
    setAmountTouched(false);
    setPhoto(null);
  }

  async function handleCreateCategory(name: string) {
    setCreatingOption(true);
    const { data, error } = await supabase
      .from("categories")
      .insert({ name, type: line.type })
      .select()
      .single();
    setCreatingOption(false);
    if (error || !data) {
      show("Couldn't add that category", "error");
      return;
    }
    setCategories((c) => [...c, data as Category].sort((a, b) => a.name.localeCompare(b.name)));
    update("categoryId", data.id);
  }

  async function handleCreateWorker(name: string) {
    setCreatingOption(true);
    const { data, error } = await supabase
      .from("workers")
      .insert({ name, role: WORKER_ROLES[0], default_site_id: selectedSiteId })
      .select()
      .single();
    setCreatingOption(false);
    if (error || !data) {
      show("Couldn't add that worker", "error");
      return;
    }
    setWorkers((w) => [...w, data as Worker].sort((a, b) => a.name.localeCompare(b.name)));
    update("workerId", data.id);
  }

  function validateLine(): string | null {
    const amountNum = parseFloat(line.amount);
    if (!amountNum || amountNum <= 0) return "Enter an amount greater than 0";
    if (line.type === "labour" && !line.workerId) return "Select or add a worker";
    return null;
  }

  function handleAddToList(e: React.FormEvent) {
    e.preventDefault();
    const err = validateLine();
    if (err) {
      show(err, "error");
      return;
    }
    const categoryLabel = categories.find((c) => c.id === line.categoryId)?.name || null;
    const workerLabel = workers.find((w) => w.id === line.workerId)?.name || null;
    const item: PendingItem = {
      ...line,
      localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      categoryLabel,
      workerLabel,
      photo,
    };
    setItems((list) => [...list, item]);
    resetLine();
    show("Added to list", "info");
  }

  function removeItem(localId: string) {
    setItems((list) => list.filter((i) => i.localId !== localId));
  }

  async function handleSaveAll() {
    if (!selectedSiteId) {
      show("Select a construction site first", "error");
      return;
    }
    if (items.length === 0) return;

    setSavingAll(true);

    const rows = [];
    for (const item of items) {
      let photoUrl: string | null = null;
      if (item.photo) {
        const path = `${selectedSiteId}/${Date.now()}-${item.photo.name}`;
        const { error: uploadError } = await supabase.storage.from("receipts").upload(path, item.photo);
        if (!uploadError) {
          photoUrl = supabase.storage.from("receipts").getPublicUrl(path).data.publicUrl;
        }
      }
      rows.push({
        site_id: selectedSiteId,
        entry_date: item.entryDate,
        type: item.type,
        category_id: item.categoryId,
        worker_id: item.type === "labour" ? item.workerId : null,
        description: item.description,
        quantity: item.quantity ? parseFloat(item.quantity) : null,
        unit_price: item.unitPrice ? parseFloat(item.unitPrice) : null,
        amount: parseFloat(item.amount),
        photo_url: photoUrl,
        status: "submitted",
      });
    }

    const { error } = await supabase.from("entries").insert(rows);
    setSavingAll(false);

    if (error) {
      show("Couldn't save — please try again", "error");
      return;
    }

    const dates = items.map((i) => i.entryDate).sort();
    const start = dates[0];
    const end = dates[dates.length - 1];

    show(`Saved ${rows.length} ${rows.length === 1 ? "entry" : "entries"}`, "success", {
      label: "View Bill",
      onClick: () => router.push(`/bill?start=${start}&end=${end}`),
    });
    setItems([]);
    draft.clearDraft();
  }

  const categoryOptions = categories.map((c) => ({ id: c.id, label: c.name }));
  const workerOptions = workers.map((w) => ({ id: w.id, label: w.name, sublabel: w.role }));
  const listTotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {draft.recoverable && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-inset ring-amber-200">
          <span className="text-amber-800">
            You have unsaved work from {relativeTime(draft.recoverable.savedAt)}.
          </span>
          <div className="flex shrink-0 gap-2">
            <button onClick={restoreDraft} className="font-semibold text-amber-800 underline">
              Restore
            </button>
            <button onClick={draft.dismissRecovered} className="font-semibold text-slate-500">
              Discard
            </button>
          </div>
        </div>
      )}

      <Card>
        <form onSubmit={handleAddToList} className="flex flex-col gap-4">
          <EntryTypeToggle value={line.type} onChange={(t) => update("type", t)} />

          <Field label="Site">
            <Input value={selectedSite?.name || "No site selected"} disabled />
          </Field>

          <Field label="Date">
            <Input
              type="date"
              value={line.entryDate}
              max={todayISO()}
              onChange={(e) => update("entryDate", e.target.value)}
              required
            />
          </Field>

          {line.type === "labour" ? (
            <Field label="Worker (Labour / Mason)">
              <SearchableSelect
                value={line.workerId}
                onChange={(id) => update("workerId", id)}
                options={workerOptions}
                placeholder="Search or add a worker..."
                onCreate={handleCreateWorker}
                creating={creatingOption}
              />
            </Field>
          ) : (
            <Field label="Category">
              <SearchableSelect
                value={line.categoryId}
                onChange={(id) => update("categoryId", id)}
                options={categoryOptions}
                placeholder="Search or add a category..."
                onCreate={handleCreateCategory}
                creating={creatingOption}
              />
            </Field>
          )}

          <Field label="Description">
            <Input
              value={line.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder={
                line.type === "labour" ? "e.g. 2 days work, plastering" : "e.g. 10 bags OPC cement"
              }
            />
          </Field>

          {line.type === "purchase" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity" hint="Optional">
                <Input
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(e) => update("quantity", e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Unit Price" hint="Optional">
                <Input
                  inputMode="decimal"
                  value={line.unitPrice}
                  onChange={(e) => update("unitPrice", e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
          )}

          <Field label="Amount" hint={autoAmount && !amountTouched ? "Auto-calculated from quantity × price" : undefined}>
            <Input
              inputMode="decimal"
              value={line.amount}
              onChange={(e) => {
                setAmountTouched(true);
                update("amount", e.target.value);
              }}
              placeholder="0"
              required
            />
          </Field>

          <Field label="Receipt Photo" hint="Optional">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700"
            />
          </Field>

          <Button type="submit" variant="secondary" size="lg" className="w-full">
            + Add to List
          </Button>
        </form>
      </Card>

      {items.length > 0 && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">
              {items.length} {items.length === 1 ? "item" : "items"} ready to save
            </p>
            <p className="text-sm font-bold text-slate-900">{formatMoney(listTotal)}</p>
          </div>
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const style = ENTRY_TYPE_STYLES[item.type];
              const title = item.type === "labour" ? item.workerLabel || "Worker" : item.categoryLabel || "—";
              return (
                <div key={item.localId} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
                    <p className="truncate text-xs text-slate-400">{item.description || "—"} · {item.entryDate}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-slate-900">{formatMoney(parseFloat(item.amount) || 0)}</p>
                  <button
                    onClick={() => removeItem(item.localId)}
                    aria-label="Remove"
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
          <Button size="lg" disabled={savingAll} onClick={handleSaveAll} className="w-full">
            {savingAll ? "Saving..." : `Save All (${items.length}) · ${formatMoney(listTotal)}`}
          </Button>
        </Card>
      )}

      <button
        onClick={() => router.push("/ledger")}
        className="text-center text-sm font-semibold text-slate-500"
      >
        View site ledger instead
      </button>
    </div>
  );
}
