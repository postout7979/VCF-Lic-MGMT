import { useEffect, useMemo, useRef, useState } from "react";

import { assignVCenterItemsToProject, fetchVCenterItems } from "../api/client";
import type { ProjectSummary, VCenterInventoryItem } from "../types";

interface Props {
  project: ProjectSummary;
  onClose: () => void;
  onAssigned: () => void;
}

interface ClusterRow {
  key: string;
  connectionName: string;
  connectionHost: string;
  clusterName: string;
  hosts: VCenterInventoryItem[];
}

const SEARCH_FIELDS: { value: string; label: string; getValue: (item: VCenterInventoryItem) => string | null }[] = [
  { value: "connection_name", label: "연결 이름", getValue: (item) => item.connection_name },
  { value: "connection_host", label: "vCenter 이름", getValue: (item) => item.connection_host },
  { value: "cluster_name", label: "클러스터 이름", getValue: (item) => item.cluster_name },
];

function TriCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} />;
}

function VCenterAssignModal({ project, onClose, onAssigned }: Props) {
  const [items, setItems] = useState<VCenterInventoryItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  useEffect(() => {
    fetchVCenterItems({ assignableForProject: project.id })
      .then((data) => {
        setItems(data);
        setSelected(new Set(data.filter((item) => item.project_id === project.id).map((item) => item.id)));
      })
      .catch(() => setError("할당 가능한 vCenter 항목을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [project.id]);

  const filteredItems = useMemo(() => {
    const query = activeSearch.trim().toLowerCase();
    if (!query) return items;
    const field = SEARCH_FIELDS.find((f) => f.value === searchField) ?? SEARCH_FIELDS[0];
    return items.filter((item) => (field.getValue(item) ?? "").toLowerCase().includes(query));
  }, [items, activeSearch, searchField]);

  function handleSearch() {
    setActiveSearch(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput("");
    setActiveSearch("");
  }

  // One row per cluster, not per host - checking a cluster assigns every
  // host in it.
  const clusterRows = useMemo<ClusterRow[]>(() => {
    const byCluster = new Map<string, ClusterRow>();
    for (const item of filteredItems) {
      const connectionName = item.connection_name ?? "(알 수 없음)";
      const key = `${connectionName}::${item.cluster_name ?? "(알 수 없음)"}`;
      let row = byCluster.get(key);
      if (!row) {
        row = {
          key,
          connectionName,
          connectionHost: item.connection_host ?? "-",
          clusterName: item.cluster_name ?? "(알 수 없음)",
          hosts: [],
        };
        byCluster.set(key, row);
      }
      row.hosts.push(item);
    }
    return Array.from(byCluster.values());
  }, [filteredItems]);

  function setHosts(hosts: VCenterInventoryItem[], select: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const host of hosts) {
        if (select) next.add(host.id);
        else next.delete(host.id);
      }
      return next;
    });
  }

  function selectionState(hosts: VCenterInventoryItem[]): { checked: boolean; indeterminate: boolean } {
    const selectedCount = hosts.filter((h) => selected.has(h.id)).length;
    return {
      checked: selectedCount === hosts.length && hosts.length > 0,
      indeterminate: selectedCount > 0 && selectedCount < hosts.length,
    };
  }

  const allState = selectionState(filteredItems);

  function toggleAll() {
    setHosts(filteredItems, !allState.checked);
  }

  async function handleAssign() {
    setSubmitting(true);
    setError(null);
    try {
      await assignVCenterItemsToProject(project.id, Array.from(selected));
      onAssigned();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "할당에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>{project.name} — vCenter 할당</h2>
        <p className="text-muted">
          클러스터를 체크하면 하위 Host가 모두 선택됩니다.
        </p>
        {error && <p className="error-text">{error}</p>}
        {!loading && items.length > 0 && (
          <div className="search-bar">
            <select value={searchField} onChange={(e) => setSearchField(e.target.value)}>
              {SEARCH_FIELDS.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="검색어를 입력하세요"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button className="btn" onClick={handleSearch}>
              검색
            </button>
            {activeSearch && (
              <button className="btn btn-secondary" onClick={handleClearSearch}>
                초기화
              </button>
            )}
          </div>
        )}
        <div className="modal-scroll">
          {loading ? (
            <p style={{ padding: 16 }}>불러오는 중...</p>
          ) : items.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              할당 가능한 vCenter 항목이 없습니다. Legacy Infra 탭에서 먼저 vCenter 어답터를
              연결해주세요.
            </p>
          ) : clusterRows.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              검색 결과가 없습니다.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={allState.checked} onChange={toggleAll} />
                  </th>
                  <th>연결 이름</th>
                  <th>vCenter 이름</th>
                  <th>클러스터 이름</th>
                </tr>
              </thead>
              <tbody>
                {clusterRows.map((row) => {
                  const rowState = selectionState(row.hosts);
                  return (
                    <tr key={row.key}>
                      <td>
                        <TriCheckbox
                          checked={rowState.checked}
                          indeterminate={rowState.indeterminate}
                          onChange={() => setHosts(row.hosts, !rowState.checked)}
                        />
                      </td>
                      <td>{row.connectionName}</td>
                      <td>{row.connectionHost}</td>
                      <td>{row.clusterName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            닫기
          </button>
          <button className="btn" onClick={handleAssign} disabled={submitting}>
            저장 ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}

export default VCenterAssignModal;
