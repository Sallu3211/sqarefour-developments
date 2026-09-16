"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EntryForm } from "@/components/entries/EntryForm";
import type { EntryType } from "@/lib/types";

function EntryFormWithParams() {
  const params = useSearchParams();
  const typeParam = params.get("type");
  const initialType: EntryType =
    typeParam === "labour" || typeParam === "other" ? typeParam : "purchase";
  return <EntryForm initialType={initialType} />;
}

export default function NewEntryPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Add Entry</h1>
      <Suspense fallback={null}>
        <EntryFormWithParams />
      </Suspense>
    </div>
  );
}
