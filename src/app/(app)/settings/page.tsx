"use client";

import { useEffect, useState } from "react";
import { useSites } from "@/context/SiteContext";
import { useToast } from "@/context/ToastContext";
import { useBranding } from "@/hooks/useBranding";
import { supabase } from "@/lib/supabase/client";
import type { Category, CategoryType, Site, Worker } from "@/lib/types";
import { WORKER_ROLES } from "@/lib/constants";
import { Button, Card, Input, Spinner } from "@/components/ui/Primitives";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Logo } from "@/components/ui/Logo";
import { IconEdit } from "@/components/layout/NavIcons";
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

  const [pendingRemove, setPendingRemove] = useState<Site | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{ id: string; summary: string } | null>(null);

  async function deactivate(id: string) {
    setPendingRemove(null);
    await supabase.from("sites").update({ is_active: false }).eq("id", id);
    refresh();
    show("Site removed", "info");
  }

  function startEdit(s: Site) {
    setEditingId(s.id);
    setEditName(s.name);
  }

  function requestSave(s: Site) {
    if (!editName.trim() || editName.trim() === s.name) {
      setEditingId(null);
      return;
    }
    setPendingEdit({ id: s.id, summary: `Name: ${s.name} → ${editName.trim()}` });
  }

  async function confirmSaveEdit() {
    if (!pendingEdit) return;
    const id = pendingEdit.id;
    setPendingEdit(null);
    setEditSaving(true);
    const { error } = await supabase.from("sites").update({ name: editName.trim() }).eq("id", id);
    setEditSaving(false);
    if (error) {
      show("Couldn't save changes", "error");
      return;
    }
    setEditingId(null);
    refresh();
    show("Site updated", "success");
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New site name" />
        <Button onClick={handleAdd} disabled={saving || !name.trim()}>
          Add
        </Button>
      </Card>
      {sites.map((s) =>
        editingId === s.id ? (
          <div key={s.id} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus className="flex-1" />
            <Button size="sm" onClick={() => requestSave(s)} disabled={editSaving || !editName.trim()}>
              Save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5">
            <span className="font-medium text-slate-800">{s.name}</span>
            <div className="flex items-center gap-3">
              <button onClick={() => startEdit(s)} aria-label="Edit site" className="text-slate-400 hover:text-amber-600">
                <IconEdit className="h-4 w-4" />
              </button>
              <button onClick={() => setPendingRemove(s)} className="text-xs font-semibold text-red-500">
                Remove
              </button>
            </div>
          </div>
        )
      )}
      <ConfirmDialog
        open={!!pendingRemove}
        title={`Remove "${pendingRemove?.name}"?`}
        description="It will no longer appear in the site picker, but past entries and bills for it stay intact."
        confirmLabel="Remove"
        danger
        onConfirm={() => pendingRemove && deactivate(pendingRemove.id)}
        onCancel={() => setPendingRemove(null)}
      />
      <ConfirmDialog
        open={!!pendingEdit}
        title="Save this change?"
        description={pendingEdit?.summary}
        confirmLabel="Save"
        onConfirm={confirmSaveEdit}
        onCancel={() => setPendingEdit(null)}
      />
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

  const [pendingRemove, setPendingRemove] = useState<Category | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CategoryType>("purchase");
  const [editSaving, setEditSaving] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{ id: string; summary: string } | null>(null);

  async function deactivate(id: string) {
    setPendingRemove(null);
    await supabase.from("categories").update({ is_active: false }).eq("id", id);
    load();
    show("Category removed", "info");
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditType(c.type);
  }

  function requestSave(c: Category) {
    const changes: string[] = [];
    if (editName.trim() && editName.trim() !== c.name) changes.push(`Name: ${c.name} → ${editName.trim()}`);
    if (editType !== c.type) changes.push(`Type: ${c.type} → ${editType}`);
    if (changes.length === 0) {
      setEditingId(null);
      return;
    }
    setPendingEdit({ id: c.id, summary: changes.join("\n") });
  }

  async function confirmSaveEdit() {
    if (!pendingEdit) return;
    const id = pendingEdit.id;
    setPendingEdit(null);
    setEditSaving(true);
    const { error } = await supabase
      .from("categories")
      .update({ name: editName.trim(), type: editType })
      .eq("id", id);
    setEditSaving(false);
    if (error) {
      show("Couldn't save changes", "error");
      return;
    }
    setEditingId(null);
    load();
    show("Category updated", "success");
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
        categories.map((c) =>
          editingId === c.id ? (
            <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
              <div className="flex gap-2">
                {(["purchase", "labour", "other"] as CategoryType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEditType(t)}
                    className={clsx(
                      "flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold capitalize",
                      editType === t ? "bg-amber-500 text-slate-900" : "bg-white text-slate-600"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => requestSave(c)} disabled={editSaving || !editName.trim()}>
                  Save
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5">
              <div>
                <p className="font-medium text-slate-800">{c.name}</p>
                <p className="text-xs capitalize text-slate-400">{c.type}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => startEdit(c)} aria-label="Edit category" className="text-slate-400 hover:text-amber-600">
                  <IconEdit className="h-4 w-4" />
                </button>
                <button onClick={() => setPendingRemove(c)} className="text-xs font-semibold text-red-500">
                  Remove
                </button>
              </div>
            </div>
          )
        )
      )}
      <ConfirmDialog
        open={!!pendingRemove}
        title={`Remove "${pendingRemove?.name}"?`}
        description="It won't show up when adding new entries, but past entries keep this category."
        confirmLabel="Remove"
        danger
        onConfirm={() => pendingRemove && deactivate(pendingRemove.id)}
        onCancel={() => setPendingRemove(null)}
      />
      <ConfirmDialog
        open={!!pendingEdit}
        title="Save these changes?"
        description={pendingEdit?.summary}
        confirmLabel="Save"
        onConfirm={confirmSaveEdit}
        onCancel={() => setPendingEdit(null)}
      />
    </div>
  );
}

interface WorkerWithSite extends Worker {
  site?: Site | null;
}

function WorkersTab() {
  const { show } = useToast();
  const { sites, addSite } = useSites();
  const [workers, setWorkers] = useState<WorkerWithSite[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState(WORKER_ROLES[0]);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [creatingSite, setCreatingSite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("workers")
      .select("*, site:sites(*)")
      .eq("is_active", true)
      .order("name");
    setWorkers((data as WorkerWithSite[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("workers").insert({ name: name.trim(), role, default_site_id: siteId });
    setSaving(false);
    if (error) {
      show("Couldn't add worker", "error");
      return;
    }
    setName("");
    setSiteId(null);
    show("Worker added", "success");
    load();
  }

  const [pendingRemove, setPendingRemove] = useState<WorkerWithSite | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState(WORKER_ROLES[0]);
  const [editSiteId, setEditSiteId] = useState<string | null>(null);
  const [editCreatingSite, setEditCreatingSite] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  async function deactivate(id: string) {
    setPendingRemove(null);
    await supabase.from("workers").update({ is_active: false }).eq("id", id);
    load();
    show("Worker removed", "info");
  }

  function startEdit(w: WorkerWithSite) {
    setEditingId(w.id);
    setEditName(w.name);
    setEditRole(w.role);
    setEditSiteId(w.default_site_id);
  }

  const [pendingEdit, setPendingEdit] = useState<{ id: string; summary: string } | null>(null);

  function requestSave(w: WorkerWithSite) {
    const changes: string[] = [];
    if (editName.trim() && editName.trim() !== w.name) changes.push(`Name: ${w.name} → ${editName.trim()}`);
    if (editRole !== w.role) changes.push(`Role: ${w.role} → ${editRole}`);
    if (editSiteId !== w.default_site_id) {
      const oldSite = w.site?.name || "—";
      const newSite = sites.find((s) => s.id === editSiteId)?.name || "—";
      changes.push(`Site: ${oldSite} → ${newSite}`);
    }
    if (changes.length === 0) {
      setEditingId(null);
      return;
    }
    setPendingEdit({ id: w.id, summary: changes.join("\n") });
  }

  async function confirmSaveEdit() {
    if (!pendingEdit) return;
    const id = pendingEdit.id;
    setPendingEdit(null);
    setEditSaving(true);
    const { error } = await supabase
      .from("workers")
      .update({ name: editName.trim(), role: editRole, default_site_id: editSiteId })
      .eq("id", id);
    setEditSaving(false);
    if (error) {
      show("Couldn't save changes", "error");
      return;
    }
    setEditingId(null);
    load();
    show("Worker updated", "success");
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
        <SearchableSelect
          value={siteId}
          onChange={setSiteId}
          options={sites.map((s) => ({ id: s.id, label: s.name, sublabel: s.code || undefined }))}
          placeholder="Assign to a site (optional)..."
          onCreate={async (n) => {
            setCreatingSite(true);
            const site = await addSite(n);
            setCreatingSite(false);
            if (site) setSiteId(site.id);
          }}
          creating={creatingSite}
        />
        <Button onClick={handleAdd} disabled={saving || !name.trim()}>
          Add Worker
        </Button>
      </Card>
      {loading ? (
        <Spinner className="mx-auto h-5 w-5 text-amber-500" />
      ) : (
        workers.map((w) =>
          editingId === w.id ? (
            <div key={w.id} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
              <div className="flex gap-2 overflow-x-auto">
                {WORKER_ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setEditRole(r)}
                    className={clsx(
                      "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold",
                      editRole === r ? "bg-amber-500 text-slate-900" : "bg-white text-slate-600"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <SearchableSelect
                value={editSiteId}
                onChange={setEditSiteId}
                options={sites.map((s) => ({ id: s.id, label: s.name, sublabel: s.code || undefined }))}
                placeholder="Assign to a site (optional)..."
                onCreate={async (n) => {
                  setEditCreatingSite(true);
                  const site = await addSite(n);
                  setEditCreatingSite(false);
                  if (site) setEditSiteId(site.id);
                }}
                creating={editCreatingSite}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => requestSave(w)} disabled={editSaving || !editName.trim()}>
                  Save
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div key={w.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5">
              <div>
                <p className="font-medium text-slate-800">{w.name}</p>
                <p className="text-xs text-slate-400">
                  {w.role}
                  {w.site ? ` · ${w.site.name}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => startEdit(w)} aria-label="Edit worker" className="text-slate-400 hover:text-amber-600">
                  <IconEdit className="h-4 w-4" />
                </button>
                <button onClick={() => setPendingRemove(w)} className="text-xs font-semibold text-red-500">
                  Remove
                </button>
              </div>
            </div>
          )
        )
      )}
      <ConfirmDialog
        open={!!pendingRemove}
        title={`Remove "${pendingRemove?.name}"?`}
        description="They'll no longer appear when logging labour/mason payments, but past payments stay in their history."
        confirmLabel="Remove"
        danger
        onConfirm={() => pendingRemove && deactivate(pendingRemove.id)}
        onCancel={() => setPendingRemove(null)}
      />
      <ConfirmDialog
        open={!!pendingEdit}
        title="Save these changes?"
        description={pendingEdit?.summary}
        confirmLabel="Save"
        onConfirm={confirmSaveEdit}
        onCancel={() => setPendingEdit(null)}
      />
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
