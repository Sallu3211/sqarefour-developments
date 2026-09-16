"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSites } from "@/context/SiteContext";
import { useToast } from "@/context/ToastContext";
import { useDraft } from "@/hooks/useDraft";
import { supabase } from "@/lib/supabase/client";
import { relativeTime, todayISO } from "@/lib/format";
import { WORKER_ROLES } from "@/lib/constants";
import type { Category, EntryType, Worker } from "@/lib/types";
import { Button, Card, Field, Input } from "@/components/ui/Primitives";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { EntryTypeToggle } from "./EntryTypeToggle";

interface DraftShape {
  type: EntryType;
  entryDate: string;
  categoryId: string | null;
  workerId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

const EMPTY: DraftShape = {
  type: "purchase",
  entryDate: todayISO(),
  categoryId: null,
  workerId: null,
  description: "",
  quantity: "",
  unitPrice: "",
  amount: "",
};

const DRAFT_KEY = "entry-form";

export function EntryForm({ initialType }: { initialType: EntryType }) {
  const { selectedSiteId, selectedSite } = useSites();
  const { show } = useToast();
  const router = useRouter();

  const [form, setForm] = useState<DraftShape>({ ...EMPTY, type: initialType });
  const [amountTouched, setAmountTouched] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [creatingOption, setCreatingOption] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const draft = useDraft(DRAFT_KEY, "entry", form, true);

  useEffect(() => {
    if (draft.checked && draft.recoverable) {
      // Only offer recovery if there's meaningful content beyond the defaults.
      const d = draft.recoverable.data;
      if (!d.description && !d.amount && !d.categoryId && !d.workerId) {
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
        .eq("type", form.type)
        .eq("is_active", true)
        .order("name");
      if (!cancelled) setCategories((data as Category[]) || []);
    }
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [form.type]);

  useEffect(() => {
    if (form.type !== "labour") return;
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
  }, [form.type]);

  const autoAmount = useMemo(() => {
    const q = parseFloat(form.quantity);
    const p = parseFloat(form.unitPrice);
    if (!isNaN(q) && !isNaN(p)) return (q * p).toString();
    return null;
  }, [form.quantity, form.unitPrice]);

  useEffect(() => {
    if (!amountTouched && autoAmount !== null) {
      setForm((f) => ({ ...f, amount: autoAmount }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAmount]);

  function update<K extends keyof DraftShape>(key: K, value: DraftShape[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function restoreDraft() {
    if (draft.recoverable) {
      setForm(draft.recoverable.data);
      setAmountTouched(true);
    }
    draft.dismissRecovered();
  }

  function resetForKeepGoing() {
    setForm({ ...EMPTY, type: form.type, entryDate: form.entryDate });
    setAmountTouched(false);
    setPhoto(null);
    draft.clearDraft();
  }

  async function handleCreateCategory(name: string) {
    setCreatingOption(true);
    const { data, error } = await supabase
      .from("categories")
      .insert({ name, type: form.type })
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSiteId) {
      show("Select a construction site first", "error");
      return;
    }
    const amountNum = parseFloat(form.amount);
    if (!amountNum || amountNum <= 0) {
      show("Enter an amount greater than 0", "error");
      return;
    }
    if (form.type === "labour" && !form.workerId) {
      show("Select or add a worker", "error");
      return;
    }

    setSubmitting(true);
    let photoUrl: string | null = null;

    if (photo) {
      const path = `${selectedSiteId}/${Date.now()}-${photo.name}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(path, photo);
      if (!uploadError) {
        photoUrl = supabase.storage.from("receipts").getPublicUrl(path).data.publicUrl;
      }
    }

    const { error } = await supabase.from("entries").insert({
      site_id: selectedSiteId,
      entry_date: form.entryDate,
      type: form.type,
      category_id: form.categoryId,
      worker_id: form.type === "labour" ? form.workerId : null,
      description: form.description,
      quantity: form.quantity ? parseFloat(form.quantity) : null,
      unit_price: form.unitPrice ? parseFloat(form.unitPrice) : null,
      amount: amountNum,
      photo_url: photoUrl,
      status: "submitted",
    });

    setSubmitting(false);

    if (error) {
      show("Couldn't save — please try again", "error");
      return;
    }

    show("Entry saved", "success");
    resetForKeepGoing();
  }

  const categoryOptions = categories.map((c) => ({ id: c.id, label: c.name }));
  const workerOptions = workers.map((w) => ({ id: w.id, label: w.name, sublabel: w.role }));

  return (
    <div className="flex flex-col gap-4">
      {draft.recoverable && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-inset ring-amber-200">
          <span className="text-amber-800">
            You have an unsaved entry from {relativeTime(draft.recoverable.savedAt)}.
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <EntryTypeToggle value={form.type} onChange={(t) => update("type", t)} />

          <Field label="Site">
            <Input value={selectedSite?.name || "No site selected"} disabled />
          </Field>

          <Field label="Date">
            <Input
              type="date"
              value={form.entryDate}
              max={todayISO()}
              onChange={(e) => update("entryDate", e.target.value)}
              required
            />
          </Field>

          {form.type === "labour" ? (
            <Field label="Worker (Labour / Mason)">
              <SearchableSelect
                value={form.workerId}
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
                value={form.categoryId}
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
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder={
                form.type === "labour" ? "e.g. 2 days work, plastering" : "e.g. 10 bags OPC cement"
              }
            />
          </Field>

          {form.type === "purchase" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity" hint="Optional">
                <Input
                  inputMode="decimal"
                  value={form.quantity}
                  onChange={(e) => update("quantity", e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Unit Price" hint="Optional">
                <Input
                  inputMode="decimal"
                  value={form.unitPrice}
                  onChange={(e) => update("unitPrice", e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
          )}

          <Field label="Amount" hint={autoAmount && !amountTouched ? "Auto-calculated from quantity × price" : undefined}>
            <Input
              inputMode="decimal"
              value={form.amount}
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

          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            {submitting ? "Saving..." : "Save Entry"}
          </Button>
        </form>
      </Card>

      <button
        onClick={() => router.push("/ledger")}
        className="text-center text-sm font-semibold text-slate-500"
      >
        View site ledger instead
      </button>
    </div>
  );
}
