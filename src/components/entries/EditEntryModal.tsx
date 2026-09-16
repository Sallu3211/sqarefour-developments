"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { todayISO } from "@/lib/format";
import { WORKER_ROLES } from "@/lib/constants";
import type { Category, EntryWithRelations, Worker } from "@/lib/types";
import { Button, Field, Input } from "@/components/ui/Primitives";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export function EditEntryModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: EntryWithRelations;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [entryDate, setEntryDate] = useState(entry.entry_date);
  const [categoryId, setCategoryId] = useState<string | null>(entry.category_id);
  const [workerId, setWorkerId] = useState<string | null>(entry.worker_id);
  const [description, setDescription] = useState(entry.description);
  const [quantity, setQuantity] = useState(entry.quantity != null ? String(entry.quantity) : "");
  const [unitPrice, setUnitPrice] = useState(entry.unit_price != null ? String(entry.unit_price) : "");
  const [amount, setAmount] = useState(String(entry.amount));
  const [categories, setCategories] = useState<Category[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [creatingOption, setCreatingOption] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (entry.type === "labour") {
        const { data } = await supabase.from("workers").select("*").eq("is_active", true).order("name");
        if (!cancelled) setWorkers((data as Worker[]) || []);
      } else {
        const { data } = await supabase
          .from("categories")
          .select("*")
          .eq("type", entry.type)
          .eq("is_active", true)
          .order("name");
        if (!cancelled) setCategories((data as Category[]) || []);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [entry.type]);

  async function handleCreateCategory(name: string) {
    setCreatingOption(true);
    const { data, error } = await supabase.from("categories").insert({ name, type: entry.type }).select().single();
    setCreatingOption(false);
    if (error || !data) return;
    setCategories((c) => [...c, data as Category].sort((a, b) => a.name.localeCompare(b.name)));
    setCategoryId(data.id);
  }

  async function handleCreateWorker(name: string) {
    setCreatingOption(true);
    const { data, error } = await supabase
      .from("workers")
      .insert({ name, role: WORKER_ROLES[0], default_site_id: entry.site_id })
      .select()
      .single();
    setCreatingOption(false);
    if (error || !data) return;
    setWorkers((w) => [...w, data as Worker].sort((a, b) => a.name.localeCompare(b.name)));
    setWorkerId(data.id);
  }

  async function handleSave() {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    if (entry.type === "labour" && !workerId) {
      setError("Select or add a worker");
      return;
    }
    setError(null);
    setSaving(true);
    const { error: updateError } = await supabase
      .from("entries")
      .update({
        entry_date: entryDate,
        category_id: entry.type === "labour" ? null : categoryId,
        worker_id: entry.type === "labour" ? workerId : null,
        description,
        quantity: quantity ? parseFloat(quantity) : null,
        unit_price: unitPrice ? parseFloat(unitPrice) : null,
        amount: amountNum,
      })
      .eq("id", entry.id);
    setSaving(false);
    if (updateError) {
      setError("Couldn't save — please try again");
      return;
    }
    onSaved();
  }

  const categoryOptions = categories.map((c) => ({ id: c.id, label: c.name }));
  const workerOptions = workers.map((w) => ({ id: w.id, label: w.name, sublabel: w.role }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Edit Entry</h3>
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Date">
            <Input type="date" value={entryDate} max={todayISO()} onChange={(e) => setEntryDate(e.target.value)} />
          </Field>

          {entry.type === "labour" ? (
            <Field label="Worker (Labour / Mason)">
              <SearchableSelect
                value={workerId}
                onChange={setWorkerId}
                options={workerOptions}
                placeholder="Search or add a worker..."
                onCreate={handleCreateWorker}
                creating={creatingOption}
              />
            </Field>
          ) : (
            <Field label="Category">
              <SearchableSelect
                value={categoryId}
                onChange={setCategoryId}
                options={categoryOptions}
                placeholder="Search or add a category..."
                onCreate={handleCreateCategory}
                creating={creatingOption}
              />
            </Field>
          )}

          <Field label="Description">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          {entry.type === "purchase" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity" hint="Optional">
                <Input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </Field>
              <Field label="Unit Price" hint="Optional">
                <Input inputMode="decimal" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
              </Field>
            </div>
          )}

          <Field label="Amount">
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
