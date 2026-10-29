export interface ExpiryCounts {
  normal: number;
  expired: number;
}

function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export function countByExpiry<T>(
  items: T[],
  getEndDate: (item: T) => string | null | undefined,
): ExpiryCounts {
  let normal = 0;
  let expired = 0;
  for (const item of items) {
    if (isExpired(getEndDate(item))) expired += 1;
    else normal += 1;
  }
  return { normal, expired };
}

/** Same split as countByExpiry, but sums a quantity field instead of
 * counting rows. */
export function sumByExpiry<T>(
  items: T[],
  getEndDate: (item: T) => string | null | undefined,
  getQuantity: (item: T) => number,
): ExpiryCounts {
  let normal = 0;
  let expired = 0;
  for (const item of items) {
    const quantity = getQuantity(item);
    if (isExpired(getEndDate(item))) expired += quantity;
    else normal += quantity;
  }
  return { normal, expired };
}

export interface ClassifiedExpiry {
  key: string;
  label: string;
  normal: number;
  expired: number;
}

/** Splits items into one group per classification value (e.g. license_type
 * or unit), each carrying its own normal/expired quantity split - so each
 * type gets its own 유지/만료 chart instead of one chart mixing every type
 * together. */
export function sumExpiryByClassification<T>(
  items: T[],
  getClassification: (item: T) => string | null | undefined,
  getEndDate: (item: T) => string | null | undefined,
  getQuantity: (item: T) => number,
  normalizeLabel?: (raw: string) => string,
): ClassifiedExpiry[] {
  const groups = new Map<string, ClassifiedExpiry>();
  for (const item of items) {
    const raw = (getClassification(item) ?? "").trim();
    if (!raw) continue;
    const key = raw.toUpperCase();
    let group = groups.get(key);
    if (!group) {
      group = { key, label: normalizeLabel ? normalizeLabel(raw) : raw, normal: 0, expired: 0 };
      groups.set(key, group);
    }
    const quantity = getQuantity(item);
    if (isExpired(getEndDate(item))) group.expired += quantity;
    else group.normal += quantity;
  }
  return Array.from(groups.values()).sort(
    (a, b) => b.normal + b.expired - (a.normal + a.expired),
  );
}

export interface ClassificationSegment {
  key: string;
  label: string;
  count: number;
}

/** Groups items by a classification field, case-insensitively, keeping the
 * first-seen (or normalized) label as the display text for each group. */
export function countByClassification<T>(
  items: T[],
  getValue: (item: T) => string | null | undefined,
  normalizeLabel?: (raw: string) => string,
): ClassificationSegment[] {
  const groups = new Map<string, ClassificationSegment>();
  for (const item of items) {
    const raw = (getValue(item) ?? "").trim();
    if (!raw) continue;
    const key = raw.toUpperCase();
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, { key, label: normalizeLabel ? normalizeLabel(raw) : raw, count: 1 });
    }
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

/** Same grouping as countByClassification, but sums a quantity field
 * instead of counting rows. */
export function sumByClassification<T>(
  items: T[],
  getValue: (item: T) => string | null | undefined,
  getQuantity: (item: T) => number,
  normalizeLabel?: (raw: string) => string,
): ClassificationSegment[] {
  const groups = new Map<string, ClassificationSegment>();
  for (const item of items) {
    const raw = (getValue(item) ?? "").trim();
    if (!raw) continue;
    const key = raw.toUpperCase();
    const quantity = getQuantity(item);
    const existing = groups.get(key);
    if (existing) {
      existing.count += quantity;
    } else {
      groups.set(key, { key, label: normalizeLabel ? normalizeLabel(raw) : raw, count: quantity });
    }
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

export interface VcfCapacityUsage {
  capacity: number;
  used: number;
}

/** Sums VCF Operations core capacity/used, but dedupes capacity per
 * connection first: core_capacity is that connection's entitlement pool,
 * repeated on every domain row it reports usage for, so summing it row by
 * row double-counts the same allocation. core_used is a genuine per-domain
 * figure and is summed normally. */
export function sumVcfCapacityAndUsed(
  items: { connection_name: string | null; core_capacity: number | null; core_used: number | null }[],
): VcfCapacityUsage {
  const capacityByConnection = new Map<string, number>();
  let used = 0;
  for (const item of items) {
    const key = item.connection_name ?? "";
    if (!capacityByConnection.has(key)) {
      capacityByConnection.set(key, item.core_capacity ?? 0);
    }
    used += item.core_used ?? 0;
  }
  const capacity = Array.from(capacityByConnection.values()).reduce((sum, v) => sum + v, 0);
  return { capacity, used };
}

/** Groups vCenter inventory rows by license_category, but sums the actual
 * licensed capacity consumed rather than counting host rows: perpetual
 * licensing is sold per-CPU, term licensing (VCF) is sold per-core - the
 * same convention as the project summary's vcenter_*_quantity fields on
 * the backend. */
export function sumVCenterLicenseUsageByCategory(
  items: { license_category: string | null; cpu_sockets: number | null; total_cores: number | null }[],
): ClassificationSegment[] {
  const groups = new Map<string, ClassificationSegment>();
  for (const item of items) {
    const raw = (item.license_category ?? "").trim();
    if (!raw) continue;
    const key = raw.toUpperCase();
    const quantity = key === "SUBSCRIPTION" ? item.total_cores ?? 0 : item.cpu_sockets ?? 0;
    const existing = groups.get(key);
    if (existing) {
      existing.count += quantity;
    } else {
      groups.set(key, { key, label: normalizeVCenterLicenseCategory(raw), count: quantity });
    }
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

function normalizeVCenterLicenseCategory(raw: string): string {
  const upper = raw.toUpperCase();
  if (upper === "PERPETUAL") return "Perpetual";
  if (upper === "SUBSCRIPTION") return "Term(cores)";
  return raw;
}

export function normalizePerpetualSubscription(raw: string): string {
  const upper = raw.toUpperCase();
  if (upper === "PERPETUAL") return "Perpetual";
  if (upper === "SUBSCRIPTION") return "Subscription";
  return raw;
}

// Validated 6-slot categorical order (dataviz skill reference palette, slots 1-6):
// blue, orange, aqua, yellow, magenta, green.
export const CLASSIFICATION_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
];

export const CLASSIFICATION_OTHER_COLOR = "#9a9890";

export function colorForClassificationIndex(index: number): string {
  return CLASSIFICATION_COLORS[index] ?? CLASSIFICATION_OTHER_COLOR;
}

/** Caps the number of donut segments shown, folding the smallest remaining
 * groups into a single "기타" bucket so the chart never cycles colors. */
export function foldClassificationToOther(
  segments: ClassificationSegment[],
  limit = CLASSIFICATION_COLORS.length,
): ClassificationSegment[] {
  if (segments.length <= limit) return segments;
  const head = segments.slice(0, limit - 1);
  const rest = segments.slice(limit - 1);
  const otherCount = rest.reduce((sum, s) => sum + s.count, 0);
  return [...head, { key: "OTHER", label: "기타", count: otherCount }];
}
