export interface LicenseItem {
  id: number;
  serial_number: string;
  parent_customer: string | null;
  customer_name: string | null;
  license_key: string | null;
  license_type: string | null;
  product_name: string | null;
  quantity_ent: number;
  contract_status: string | null;
  start_date: string | null;
  end_date: string | null;
  erp_site_id: string | null;
  enduser_account_name: string | null;
  part_number: string | null;
  division: string | null;
  project_id: number | null;
}

export interface ProjectSummary {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  perpetual_quantity: number;
  subscription_quantity: number;
  item_count: number;
}

export interface ProjectDetail extends ProjectSummary {
  license_items: LicenseItem[];
}

export interface UploadResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}
