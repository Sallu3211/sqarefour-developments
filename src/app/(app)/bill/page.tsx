"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSites } from "@/context/SiteContext";
import { useToast } from "@/context/ToastContext";
import { useBranding } from "@/hooks/useBranding";
import { supabase } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { captureElementToBlob, exportElementAsImage, exportElementAsPdf, shareImageBlob } from "@/lib/export";
import type { EntryWithRelations } from "@/lib/types";
import { PeriodFilter, periodFor, type PeriodValue } from "@/components/filters/PeriodFilter";
import { BillTemplate } from "@/components/bill/BillTemplate";
import { Button, EmptyState, Spinner } from "@/components/ui/Primitives";

export default function BillPage() {
  return (
    <Suspense fallback={null}>
      <BillPageInner />
    </Suspense>
  );
}

function BillPageInner() {
  const { selectedSite, selectedSiteId } = useSites();
  const { show } = useToast();
  const { branding } = useBranding();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState<PeriodValue>(() => {
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (start && end) return { type: "custom", start, end };
    return periodFor("weekly");
  });
  const [entries, setEntries] = useState<EntryWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedSiteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("entries")
        .select("*, category:categories(*), worker:workers(*)")
        .eq("site_id", selectedSiteId)
        .is("deleted_at", null)
        .gte("effective_date", period.start)
        .lte("effective_date", period.end)
        .order("effective_date", { ascending: true });
      if (cancelled) return;
      setEntries((data as EntryWithRelations[]) || []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedSiteId, period.start, period.end]);

  // Pre-capture the bill as an image as soon as it's rendered, so the Share
  // button's click handler only has near-instant work left to do — see the
  // comment on captureElementToBlob for why this matters.
  useEffect(() => {
    setShareBlob(null);
    if (loading || !printRef.current) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!printRef.current) return;
      const blob = await captureElementToBlob(printRef.current);
      if (!cancelled) setShareBlob(blob);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loading, entries, branding.logoUrl]);

  const periodLabel = period.start === period.end ? formatDate(period.start) : `${formatDate(period.start)} – ${formatDate(period.end)}`;
  const filenameBase = `bill-${selectedSite?.name?.replace(/\s+/g, "-") || "site"}-${period.start}-to-${period.end}`;

  async function saveSnapshot(pdfUrl: string | null) {
    if (!selectedSiteId) return;
    const total = entries.reduce((s, e) => s + Number(e.amount), 0);
    await supabase.from("bills").insert({
      site_id: selectedSiteId,
      period_type: period.type,
      period_start: period.start,
      period_end: period.end,
      total_amount: total,
      snapshot_json: entries,
      pdf_url: pdfUrl,
    });
  }

  async function handleDownloadPdf() {
    if (!printRef.current) return;
    setBusy("pdf");
    await exportElementAsPdf(printRef.current, filenameBase);
    await saveSnapshot(null);
    setBusy(null);
    show("PDF downloaded", "success");
  }

  async function handleDownloadImage() {
    if (!printRef.current) return;
    setBusy("image");
    await exportElementAsImage(printRef.current, filenameBase);
    await saveSnapshot(null);
    setBusy(null);
    show("Image downloaded", "success");
  }

  async function handleShare() {
    if (!selectedSite) return;
    // Prefer the pre-captured blob (near-instant) so this click handler
    // stays inside the browser's "user activation" window that
    // navigator.share() requires. Only fall back to capturing now (slower,
    // more likely to be rejected by the browser) if it somehow isn't ready.
    let blob = shareBlob;
    if (!blob && printRef.current) {
      blob = await captureElementToBlob(printRef.current);
    }
    if (!blob) {
      show("Couldn't prepare the image — try again", "error");
      return;
    }
    setBusy("share");
    const shared = await shareImageBlob(blob, filenameBase, `${selectedSite.name} — ${periodLabel}`);
    await saveSnapshot(null);
    setBusy(null);
    show(shared ? "Shared" : "Image downloaded — attach it in WhatsApp", "success");
  }

  if (!selectedSiteId) {
    return <EmptyState title="Select a construction site" description="Choose a site from the top to generate its bill." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Bill / Report</h1>

      <PeriodFilter value={period} onChange={setPeriod} />

      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" size="sm" disabled={!!busy || loading} onClick={handleDownloadPdf}>
          {busy === "pdf" ? "..." : "Download PDF"}
        </Button>
        <Button variant="secondary" size="sm" disabled={!!busy || loading} onClick={handleDownloadImage}>
          {busy === "image" ? "..." : "Download Image"}
        </Button>
        <Button size="sm" disabled={!!busy || loading} onClick={handleShare}>
          {busy === "share" ? "..." : "Share WhatsApp"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6 text-amber-500" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <BillTemplate
            ref={printRef}
            site={selectedSite}
            periodLabel={periodLabel}
            entries={entries}
            logoUrl={branding.logoUrl}
            companyName={branding.companyName}
          />
        </div>
      )}
    </div>
  );
}
