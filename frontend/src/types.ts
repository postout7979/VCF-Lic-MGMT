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

export type VCenterVersionHint = "7.x" | "8.x";

export interface VCenterConnection {
  id: number;
  name: string;
  host: string;
  username: string;
  version_hint: VCenterVersionHint;
  detected_version: string | null;
  status: "pending" | "connected" | "failed";
  last_error: string | null;
  last_synced_at: string | null;
  created_at: string;
  host_count: number;
}

export interface VCenterInventoryItem {
  id: number;
  vcenter_name: string | null;
  cluster_name: string | null;
  host_name: string | null;
  cpu_sockets: number | null;
  cores_per_socket: number | null;
  total_cores: number | null;
  license_key: string | null;
  collected_at: string;
}
