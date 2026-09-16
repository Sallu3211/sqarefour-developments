"use client";

import { useEffect, useState } from "react";
import { useSites } from "@/context/SiteContext";
import { useToast } from "@/context/ToastContext";
import { useBranding } from "@/hooks/useBranding";
import { supabase } from "@/lib/supabase/client";
import type { Category, CategoryType, Worker } from "@/lib/types";
import { WORKER_ROLES } from "@/lib/constants";
import { Button, Card, Input, Spinner } from "@/components/ui/Primitives";
import { Logo } from "@/components/ui/Logo";
import clsx from "clsx";

type Tab = "sites" | "categories" | "workers" | "branding";

const TABS: { id: Tab; label: string }[] = [
  { id: "sites", label: "Sites" },
  { id: "categories", label: "Categories" },
  { id: "workers", label: "Workers" },
  { id: "branding", label: "Branding" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("sites");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Settings</h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold",
              tab === t.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sites" && <SitesTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "workers" && <WorkersTab />}
      {tab === "branding" && <BrandingTab />}
    </div>
  );
}

function SitesTab() {
  const { sites, addSite, refresh } = useSites();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    const site = await addSite(name.trim());
    setSaving(false);
    if (!site) {
      show("Couldn't add site", "error");
      return;
    }
    setName("");
    show("Site added", "success");
  }

  async function deactivate(id: string) {
    await supabase.from("sites").update({ is_active: false }).eq("id", id);
    refresh();
    show("Site removed", "info");
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New site name" />
        <Button onClick={handleAdd} disabled={saving || !name.trim()}>
          Add
        </Button>
      </Card>
      {sites.map((s) => (
        <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5">
          <span className="font-medium text-slate-800">{s.name}</span>
          <button onClick={() => deactivate(s.id)} className="text-xs font-semibold text-red-500">
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function CategoriesTab() {
  const { show } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("purchase");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("type").order("name");
    setCategories((data as Category[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("categories").insert({ name: name.trim(), type });
    setSaving(false);
    if (error) {
      show("Couldn't add category", "error");
      return;
    }
    setName("");
    show("Category added", "success");
    load();
  }

  async function deactivate(id: string) {
    await supabase.from("categories").update({ is_active: false }).eq("id", id);
    load();
    show("Category removed", "info");
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" />
        <div className="flex gap-2">
          {(["purchase", "labour", "other"] as CategoryType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={clsx(
                "flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold capitalize",
                type === t ? "bg-amber-500 text-slate-900" : "bg-slate-100 text-slate-600"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Button onClick={handleAdd} disabled={saving || !name.trim()}>
          Add Category
        </Button>
      </Card>
      {loading ? (
        <Spinner className="mx-auto h-5 w-5 text-amber-500" />
      ) : (
        categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5">
            <div>
              <p className="font-medium text-slate-800">{c.name}</p>
              <p className="text-xs capitalize text-slate-400">{c.type}</p>
            </div>
            <button onClick={() => deactivate(c.id)} className="text-xs font-semibold text-red-500">
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function WorkersTab() {
  const { show } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState(WORKER_ROLES[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("workers").select("*").eq("is_active", true).order("name");
    setWorkers((data as Worker[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("workers").insert({ name: name.trim(), role });
    setSaving(false);
    if (error) {
      show("Couldn't add worker", "error");
      return;
    }
    setName("");
    show("Worker added", "success");
    load();
  }

  async function deactivate(id: string) {
    await supabase.from("workers").update({ is_active: false }).eq("id", id);
    load();
    show("Worker removed", "info");
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Worker name" />
        <div className="flex gap-2 overflow-x-auto">
          {WORKER_ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={clsx(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold",
                role === r ? "bg-amber-500 text-slate-900" : "bg-slate-100 text-slate-600"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <Button onClick={handleAdd} disabled={saving || !name.trim()}>
          Add Worker
        </Button>
      </Card>
      {loading ? (
        <Spinner className="mx-auto h-5 w-5 text-amber-500" />
      ) : (
        workers.map((w) => (
          <div key={w.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5">
            <div>
              <p className="font-medium text-slate-800">{w.name}</p>
              <p className="text-xs text-slate-400">{w.role}</p>
            </div>
            <button onClick={() => deactivate(w.id)} className="text-xs font-semibold text-red-500">
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function BrandingTab() {
  const { branding, update, uploadLogo, loading } = useBranding();
  const { show } = useToast();
  const [companyName, setCompanyName] = useState(branding.companyName);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setCompanyName(branding.companyName);
  }, [branding.companyName]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadLogo(file);
    setUploading(false);
    show(url ? "Logo updated" : "Couldn't upload logo", url ? "success" : "error");
  }

  async function saveName() {
    await update({ companyName: companyName.trim() || "Squarefour Developments" });
    show("Saved", "success");
  }

  if (loading) return <Spinner className="mx-auto h-5 w-5 text-amber-500" />;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-contain ring-1 ring-slate-200" />
        ) : (
          <Logo size={64} />
        )}
        <div>
          <label className="inline-block cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            {uploading ? "Uploading..." : "Upload Logo"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
          <p className="mt-1 text-xs text-slate-400">Shown on every printed bill</p>
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Company Name</label>
        <div className="flex gap-2">
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <Button onClick={saveName}>Save</Button>
        </div>
      </div>
    </Card>
  );
}
