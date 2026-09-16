"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/context/ToastContext";
import { useSites } from "@/context/SiteContext";
import { WORKER_ROLES } from "@/lib/constants";
import type { Site, Worker } from "@/lib/types";
import { Button, Card, EmptyState, Input, Spinner } from "@/components/ui/Primitives";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface WorkerWithSite extends Worker {
  site?: Site | null;
}

export default function WorkersPage() {
  const { show } = useToast();
  const { sites, addSite } = useSites();
  const [workers, setWorkers] = useState<WorkerWithSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState(WORKER_ROLES[0]);
  const [newSiteId, setNewSiteId] = useState<string | null>(null);
  const [creatingSite, setCreatingSite] = useState(false);
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
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("workers")
      .insert({ name: newName.trim(), role: newRole, default_site_id: newSiteId });
    setSaving(false);
    if (error) {
      show("Couldn't add worker", "error");
      return;
    }
    setNewName("");
    setNewSiteId(null);
    setShowAdd(false);
    show("Worker added", "success");
    load();
  }

  const filtered = workers.filter((w) => w.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Workers</h1>
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
          + Add Worker
        </Button>
      </div>

      {showAdd && (
        <Card className="flex flex-col gap-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Worker name"
            autoFocus
          />
          <div className="flex gap-2 overflow-x-auto">
            {WORKER_ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setNewRole(r)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                  newRole === r ? "bg-amber-500 text-slate-900" : "bg-slate-100 text-slate-600"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <SearchableSelect
            value={newSiteId}
            onChange={setNewSiteId}
            options={sites.map((s) => ({ id: s.id, label: s.name, sublabel: s.code || undefined }))}
            placeholder="Assign to a site (optional)..."
            onCreate={async (name) => {
              setCreatingSite(true);
              const site = await addSite(name);
              setCreatingSite(false);
              if (site) setNewSiteId(site.id);
            }}
            creating={creatingSite}
          />
          <Button onClick={handleAdd} disabled={saving || !newName.trim()}>
            {saving ? "Saving..." : "Save Worker"}
          </Button>
        </Card>
      )}

      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workers..." />

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6 text-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No workers yet" description="Add your labour and mason team to start tracking payments." />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((w) => (
            <Link
              key={w.id}
              href={`/workers/${w.id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:border-amber-200 hover:bg-amber-50/40"
            >
              <div>
                <p className="font-semibold text-slate-800">{w.name}</p>
                <p className="text-xs text-slate-400">
                  {w.role}
                  {w.site ? ` · ${w.site.name}` : ""}
                </p>
              </div>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-slate-300">
                <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
