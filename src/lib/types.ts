export type EntryType = "purchase" | "labour" | "other";
export type CategoryType = "purchase" | "labour" | "other";
export type PeriodType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export interface Site {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  is_active: boolean;
  created_at: string;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  default_site_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Entry {
  id: string;
  site_id: string;
  entry_date: string;
  type: EntryType;
  category_id: string | null;
  worker_id: string | null;
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
  photo_url: string | null;
  status: "draft" | "submitted";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EntryWithRelations extends Entry {
  category?: Category | null;
  worker?: Worker | null;
}

export interface Bill {
  id: string;
  site_id: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  total_amount: number;
  snapshot_json: EntryWithRelations[];
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
}
