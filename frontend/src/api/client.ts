import type {
  BrandInfo,
  CspLicenseItem,
  CspLicenseItemPage,
  CurrentUser,
  LicenseItem,
  LicenseItemPage,
  NetworkSettings,
  ProjectDetail,
  ProjectSummary,
  SmtpSettings,
  UploadBatch,
  UploadResult,
  User,
  UserApplication,
  VCenterConnection,
  VCenterInventoryItem,
  VCenterVersionHint,
  VcfOpsConnection,
  VcfOpsCoreLicenseItem,
} from "../types";

const BASE = "/api/v1";
const TOKEN_KEY = "vcf_lic_mgmt_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options?.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    setAuthToken(null);
    window.dispatchEvent(new Event("auth:unauthorized"));
    throw new Error("로그인이 필요합니다.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `요청에 실패했습니다 (${res.status})`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export function login(username: string, password: string): Promise<CurrentUser & { token: string }> {
  return request<CurrentUser & { token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" });
}

export function fetchMe(): Promise<CurrentUser> {
  return request<CurrentUser>("/auth/me");
}

export function updateMe(payload: {
  name?: string;
  password?: string;
  email?: string;
}): Promise<CurrentUser> {
  return request<CurrentUser>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function signupRequest(payload: {
  name: string;
  password: string;
  email: string;
  security_answer_1: string;
  security_answer_2: string;
  security_answer_3: string;
}): Promise<void> {
  return request<void>("/auth/signup-request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchUserApplications(): Promise<UserApplication[]> {
  return request<UserApplication[]>("/user-applications");
}

export function approveUserApplication(applicationId: number): Promise<User> {
  return request<User>(`/user-applications/${applicationId}/approve`, { method: "POST" });
}

export function rejectUserApplication(applicationId: number): Promise<void> {
  return request<void>(`/user-applications/${applicationId}`, { method: "DELETE" });
}

export function generateRecoveryKey(): Promise<{ recovery_key: string }> {
  return request<{ recovery_key: string }>("/auth/admin/recovery-key", { method: "POST" });
}

export function forgotPasswordInit(
  username: string,
): Promise<{ is_admin: boolean; has_email: boolean; security_questions: string[] }> {
  return request("/auth/forgot-password/init", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function adminResetPassword(payload: {
  username: string;
  recovery_key: string;
  new_password: string;
}): Promise<void> {
  return request<void>("/auth/forgot-password/admin-reset", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function requestPasswordOtp(username: string): Promise<void> {
  return request<void>("/auth/forgot-password/request-otp", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function verifyPasswordOtp(payload: {
  username: string;
  code: string;
  new_password: string;
}): Promise<void> {
  return request<void>("/auth/forgot-password/verify-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifySecurityAnswers(payload: {
  username: string;
  answer_1: string;
  answer_2: string;
  answer_3: string;
  new_password: string;
}): Promise<void> {
  return request<void>("/auth/forgot-password/verify-security-answers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchSmtpSettings(): Promise<SmtpSettings> {
  return request<SmtpSettings>("/smtp-settings");
}

export function updateSmtpSettings(payload: {
  host: string;
  port: number;
  username: string;
  password: string;
  use_tls: boolean;
  from_address: string;
}): Promise<SmtpSettings> {
  return request<SmtpSettings>("/smtp-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function sendTestEmail(toAddress: string): Promise<void> {
  return request<void>("/smtp-settings/test", {
    method: "POST",
    body: JSON.stringify({ to_address: toAddress }),
  });
}

export function fetchNetworkSettings(): Promise<NetworkSettings> {
  return request<NetworkSettings>("/network-settings");
}

export function updateNetworkSettings(payload: {
  dns_server: string;
  ntp_server: string;
}): Promise<NetworkSettings> {
  return request<NetworkSettings>("/network-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export const BRAND_BACKGROUND_IMAGE_URL = `${BASE}/brand/background-image`;
export const BRAND_LOGO_IMAGE_URL = `${BASE}/brand/logo-image`;

export function fetchBrandInfo(): Promise<BrandInfo> {
  return request<BrandInfo>("/brand/info");
}

export function uploadBrandBackground(file: File): Promise<BrandInfo> {
  const formData = new FormData();
  formData.append("file", file);
  return request<BrandInfo>("/brand/background-image", { method: "POST", body: formData });
}

export function deleteBrandBackground(): Promise<void> {
  return request<void>("/brand/background-image", { method: "DELETE" });
}

export function uploadBrandLogo(file: File): Promise<BrandInfo> {
  const formData = new FormData();
  formData.append("file", file);
  return request<BrandInfo>("/brand/logo-image", { method: "POST", body: formData });
}

export function deleteBrandLogo(): Promise<void> {
  return request<void>("/brand/logo-image", { method: "DELETE" });
}

export function uploadSupplierData(file: File, uploadName: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_name", uploadName);
  return request<UploadResult>("/supplier-data/upload", {
    method: "POST",
    body: formData,
  });
}

export function fetchSupplierData(options?: {
  unassignedOnly?: boolean;
  assignableForProject?: number;
}): Promise<LicenseItem[]> {
  const params = new URLSearchParams();
  if (options?.assignableForProject !== undefined) {
    params.set("assignable_for_project", String(options.assignableForProject));
  } else if (options?.unassignedOnly) {
    params.set("unassigned_only", "true");
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<LicenseItem[]>(`/supplier-data${query}`);
}

export function searchSupplierData(params: {
  page: number;
  pageSize: number;
  searchField?: string;
  searchQuery?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}): Promise<LicenseItemPage> {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
  });
  if (params.searchField && params.searchQuery) {
    query.set("search_field", params.searchField);
    query.set("search_query", params.searchQuery);
  }
  if (params.sortField) {
    query.set("sort_field", params.sortField);
    query.set("sort_order", params.sortOrder ?? "asc");
  }
  return request<LicenseItemPage>(`/supplier-data/search?${query.toString()}`);
}

export function deleteAllSupplierData(): Promise<void> {
  return request<void>("/supplier-data", { method: "DELETE" });
}

export function fetchUploadBatches(): Promise<UploadBatch[]> {
  return request<UploadBatch[]>("/supplier-data/uploads");
}

export function deleteUploadBatches(uploadNames: string[]): Promise<void> {
  return request<void>("/supplier-data/uploads", {
    method: "DELETE",
    body: JSON.stringify({ upload_names: uploadNames }),
  });
}

export function fetchProjects(): Promise<ProjectSummary[]> {
  return request<ProjectSummary[]>("/projects");
}

export function createProject(name: string, description?: string): Promise<ProjectSummary> {
  return request<ProjectSummary>("/projects", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export function fetchProjectDetail(projectId: number): Promise<ProjectDetail> {
  return request<ProjectDetail>(`/projects/${projectId}`);
}

export function deleteProject(projectId: number): Promise<void> {
  return request<void>(`/projects/${projectId}`, { method: "DELETE" });
}

export function assignItemsToProject(
  projectId: number,
  itemIds: number[],
): Promise<ProjectDetail> {
  return request<ProjectDetail>(`/projects/${projectId}/assign`, {
    method: "POST",
    body: JSON.stringify({ item_ids: itemIds }),
  });
}

export function fetchVCenterConnections(): Promise<VCenterConnection[]> {
  return request<VCenterConnection[]>("/legacy-infra/vcenter-connections");
}

export function createVCenterConnection(payload: {
  name: string;
  host: string;
  username: string;
  password: string;
  version_hint: VCenterVersionHint;
  tls_skip: boolean;
  sync_interval_minutes: number;
}): Promise<VCenterConnection> {
  return request<VCenterConnection>("/legacy-infra/vcenter-connections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function syncVCenterConnection(connectionId: number): Promise<VCenterConnection> {
  return request<VCenterConnection>(`/legacy-infra/vcenter-connections/${connectionId}/sync`, {
    method: "POST",
  });
}

export function updateVCenterSyncInterval(
  connectionId: number,
  minutes: number,
): Promise<VCenterConnection> {
  return request<VCenterConnection>(
    `/legacy-infra/vcenter-connections/${connectionId}/sync-interval`,
    { method: "PATCH", body: JSON.stringify({ minutes }) },
  );
}

export function deleteVCenterConnection(connectionId: number): Promise<void> {
  return request<void>(`/legacy-infra/vcenter-connections/${connectionId}`, {
    method: "DELETE",
  });
}

export function fetchVCenterInventory(connectionId: number): Promise<VCenterInventoryItem[]> {
  return request<VCenterInventoryItem[]>(
    `/legacy-infra/vcenter-connections/${connectionId}/inventory`,
  );
}

export function fetchVCenterItems(options?: {
  assignableForProject?: number;
  assignedToProject?: number;
}): Promise<VCenterInventoryItem[]> {
  const params = new URLSearchParams();
  if (options?.assignedToProject !== undefined) {
    params.set("assigned_to_project", String(options.assignedToProject));
  } else if (options?.assignableForProject !== undefined) {
    params.set("assignable_for_project", String(options.assignableForProject));
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<VCenterInventoryItem[]>(`/legacy-infra/vcenter-items${query}`);
}

export function assignVCenterItemsToProject(
  projectId: number,
  itemIds: number[],
): Promise<number[]> {
  return request<number[]>(`/projects/${projectId}/assign-vcenter`, {
    method: "POST",
    body: JSON.stringify({ item_ids: itemIds }),
  });
}

export function fetchVcfOpsConnections(): Promise<VcfOpsConnection[]> {
  return request<VcfOpsConnection[]>("/vcf-ops/connections");
}

export function createVcfOpsConnection(payload: {
  name: string;
  host: string;
  username: string;
  password: string;
  tls_skip: boolean;
  sync_interval_minutes: number;
}): Promise<VcfOpsConnection> {
  return request<VcfOpsConnection>("/vcf-ops/connections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function syncVcfOpsConnection(connectionId: number): Promise<VcfOpsConnection> {
  return request<VcfOpsConnection>(`/vcf-ops/connections/${connectionId}/sync`, {
    method: "POST",
  });
}

export function updateVcfOpsSyncInterval(
  connectionId: number,
  minutes: number,
): Promise<VcfOpsConnection> {
  return request<VcfOpsConnection>(`/vcf-ops/connections/${connectionId}/sync-interval`, {
    method: "PATCH",
    body: JSON.stringify({ minutes }),
  });
}

export function deleteVcfOpsConnection(connectionId: number): Promise<void> {
  return request<void>(`/vcf-ops/connections/${connectionId}`, {
    method: "DELETE",
  });
}

export function fetchVcfOpsInventory(connectionId: number): Promise<VcfOpsCoreLicenseItem[]> {
  return request<VcfOpsCoreLicenseItem[]>(`/vcf-ops/connections/${connectionId}/inventory`);
}

export function uploadCspData(file: File, uploadName: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_name", uploadName);
  return request<UploadResult>("/csp-data/upload", {
    method: "POST",
    body: formData,
  });
}

export function fetchCspData(options?: {
  unassignedOnly?: boolean;
  assignableForProject?: number;
  assignedToProject?: number;
}): Promise<CspLicenseItem[]> {
  const params = new URLSearchParams();
  if (options?.assignedToProject !== undefined) {
    params.set("assigned_to_project", String(options.assignedToProject));
  } else if (options?.assignableForProject !== undefined) {
    params.set("assignable_for_project", String(options.assignableForProject));
  } else if (options?.unassignedOnly) {
    params.set("unassigned_only", "true");
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<CspLicenseItem[]>(`/csp-data${query}`);
}

export function searchCspData(params: {
  page: number;
  pageSize: number;
  searchField?: string;
  searchQuery?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}): Promise<CspLicenseItemPage> {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
  });
  if (params.searchField && params.searchQuery) {
    query.set("search_field", params.searchField);
    query.set("search_query", params.searchQuery);
  }
  if (params.sortField) {
    query.set("sort_field", params.sortField);
    query.set("sort_order", params.sortOrder ?? "asc");
  }
  return request<CspLicenseItemPage>(`/csp-data/search?${query.toString()}`);
}

export function deleteAllCspData(): Promise<void> {
  return request<void>("/csp-data", { method: "DELETE" });
}

export function fetchCspUploadBatches(): Promise<UploadBatch[]> {
  return request<UploadBatch[]>("/csp-data/uploads");
}

export function deleteCspUploadBatches(uploadNames: string[]): Promise<void> {
  return request<void>("/csp-data/uploads", {
    method: "DELETE",
    body: JSON.stringify({ upload_names: uploadNames }),
  });
}

export function assignCspItemsToProject(projectId: number, itemIds: number[]): Promise<number[]> {
  return request<number[]>(`/projects/${projectId}/assign-csp`, {
    method: "POST",
    body: JSON.stringify({ item_ids: itemIds }),
  });
}

export function fetchVcfOpsItems(options?: {
  assignableForProject?: number;
  assignedToProject?: number;
}): Promise<VcfOpsCoreLicenseItem[]> {
  const params = new URLSearchParams();
  if (options?.assignedToProject !== undefined) {
    params.set("assigned_to_project", String(options.assignedToProject));
  } else if (options?.assignableForProject !== undefined) {
    params.set("assignable_for_project", String(options.assignableForProject));
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<VcfOpsCoreLicenseItem[]>(`/vcf-ops/items${query}`);
}

export function assignVcfOpsItemsToProject(
  projectId: number,
  itemIds: number[],
): Promise<number[]> {
  return request<number[]>(`/projects/${projectId}/assign-vcf-ops`, {
    method: "POST",
    body: JSON.stringify({ item_ids: itemIds }),
  });
}

export function fetchUsers(): Promise<User[]> {
  return request<User[]>("/users");
}

export function createUser(payload: {
  name: string;
  password: string;
  email: string;
  security_answer_1: string;
  security_answer_2: string;
  security_answer_3: string;
  show_supplier_menu?: boolean;
}): Promise<User> {
  return request<User>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(
  userId: number,
  payload: {
    name?: string;
    password?: string;
    email?: string;
    security_answer_1?: string;
    security_answer_2?: string;
    security_answer_3?: string;
    show_supplier_menu?: boolean;
  },
): Promise<User> {
  return request<User>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(userId: number): Promise<void> {
  return request<void>(`/users/${userId}`, { method: "DELETE" });
}

export function assignUserProject(userId: number, projectIds: number[]): Promise<User> {
  return request<User>(`/users/${userId}/assign-project`, {
    method: "POST",
    body: JSON.stringify({ project_ids: projectIds }),
  });
}
