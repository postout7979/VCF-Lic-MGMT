import type {
  LicenseItem,
  ProjectDetail,
  ProjectSummary,
  UploadResult,
  VCenterConnection,
  VCenterInventoryItem,
  VCenterVersionHint,
} from "../types";

const BASE = "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: options?.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : undefined,
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `요청에 실패했습니다 (${res.status})`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export function uploadSupplierData(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  return request<UploadResult>("/supplier-data/upload", {
    method: "POST",
    body: formData,
  });
}

export function fetchSupplierData(unassignedOnly = false): Promise<LicenseItem[]> {
  const query = unassignedOnly ? "?unassigned_only=true" : "";
  return request<LicenseItem[]>(`/supplier-data${query}`);
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
