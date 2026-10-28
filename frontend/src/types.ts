export interface LicenseItem {
  id: number;
  upload_name: string;
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
  vcenter_count: number;
  vcenter_perpetual_quantity: number;
  vcenter_term_quantity: number;
  vcf_license_count: number;
  vcf_core_capacity: number;
  vcf_core_used: number;
  csp_license_count: number;
  csp_core_quantity: number;
  csp_core_quantity_expired: number;
  user_count: number;
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

export interface LicenseItemPage {
  items: LicenseItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const SEARCHABLE_FIELDS: { value: string; label: string }[] = [
  { value: "upload_name", label: "업로드 이름" },
  { value: "serial_number", label: "Serial Number" },
  { value: "parent_customer", label: "Parent Customer" },
  { value: "customer_name", label: "Customer Name" },
  { value: "license_key", label: "License Key" },
  { value: "license_type", label: "License Type" },
  { value: "product_name", label: "Product Name" },
  { value: "contract_status", label: "Contract Status" },
  { value: "erp_site_id", label: "ERP Site ID" },
  { value: "enduser_account_name", label: "Enduser Account Name" },
  { value: "part_number", label: "Part Number" },
  { value: "division", label: "Division" },
];

export type VCenterVersionHint = "7.x" | "8.x";

export interface VCenterConnection {
  id: number;
  name: string;
  host: string;
  username: string;
  version_hint: VCenterVersionHint;
  tls_skip: boolean;
  sync_interval_minutes: number;
  detected_version: string | null;
  status: "pending" | "connected" | "failed";
  last_error: string | null;
  last_synced_at: string | null;
  created_at: string;
  host_count: number;
}

export interface UploadBatch {
  upload_name: string;
  uploaded_at: string;
  item_count: number;
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
  license_category: string | null;
  collected_at: string;
  project_id: number | null;
}

export interface VcfOpsConnection {
  id: number;
  name: string;
  host: string;
  username: string;
  tls_skip: boolean;
  sync_interval_minutes: number;
  detected_version: string | null;
  status: "pending" | "connected" | "failed";
  last_error: string | null;
  last_synced_at: string | null;
  created_at: string;
  license_count: number;
}

export interface VcfOpsCoreLicenseItem {
  id: number;
  connection_name: string | null;
  license_key: string | null;
  license_type: string | null;
  license_status: string | null;
  domain_name: string | null;
  core_capacity: number | null;
  core_used: number | null;
  verified_core_used: number | null;
  collected_at: string;
  project_id: number | null;
}

export interface User {
  id: number;
  username: string;
  name: string | null;
  password: string;
  email: string;
  is_admin: boolean;
  show_supplier_menu: boolean;
  project_ids: number[];
  project_names: string[];
  security_answer_1: string | null;
  security_answer_2: string | null;
  security_answer_3: string | null;
  created_at: string;
}

export const SECURITY_QUESTIONS: string[] = [
  "입사년도는 언제입니까?",
  "첫 직장명은 무엇입니까?",
  "태어난 도시는 어디입니까?",
];

export interface UserApplication {
  id: number;
  name: string;
  password: string;
  email: string;
  security_answer_1: string;
  security_answer_2: string;
  security_answer_3: string;
  created_at: string;
}

export interface ApprovalRecord {
  id: number;
  name: string;
  email: string;
  approved_at: string;
}

export interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  use_tls: boolean;
  from_address: string;
  updated_at: string;
}

export interface NetworkSettings {
  dns_server: string;
  ntp_server: string;
  updated_at: string;
}

export interface BrandInfo {
  has_background_image: boolean;
  has_logo_image: boolean;
  has_default_background_image: boolean;
  has_default_logo_image: boolean;
  updated_at: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  name: string | null;
  email: string;
  is_admin: boolean;
  show_supplier_menu: boolean;
  project_ids: number[];
  project_names: string[];
}

export interface CspLicenseItem {
  id: number;
  upload_name: string;
  license_key: string | null;
  product_name: string | null;
  quantity: number;
  unit: string | null;
  folder_name: string | null;
  contract_end_date: string | null;
  project_id: number | null;
}

export interface CspLicenseItemPage {
  items: CspLicenseItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const CSP_SEARCHABLE_FIELDS: { value: string; label: string }[] = [
  { value: "upload_name", label: "업로드 이름" },
  { value: "license_key", label: "License Key" },
  { value: "product_name", label: "Product Name" },
  { value: "folder_name", label: "Folder Name" },
];
