import { useEffect, useMemo, useRef, useState } from "react";

import { assignVcfOpsItemsToProject, fetchVcfOpsItems } from "../api/client";
import type { ProjectSummary, VcfOpsCoreLicenseItem } from "../types";

interface Props {
  project: ProjectSummary;
  onClose: () => void;
  onAssigned: () => void;
}

interface ConnectionGroup {
  connectionName: string;
  items: VcfOpsCoreLicenseItem[];
}

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

function VcfOpsAssignModal({ project, onClose, onAssigned }: Props) {
  const [items, setItems] = useState<VcfOpsCoreLicenseItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  useEffect(() => {
    fetchVcfOpsItems({ assignableForProject: project.id })
      .then((data) => {
        setItems(data);
        setSelected(new Set(data.filter((item) => item.project_id === project.id).map((item) => item.id)));
        setExpanded(new Set(data.map((item) => item.connection_name ?? "(알 수 없음)")));
      })
      .catch(() => setError("할당 가능한 VCF 항목을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [project.id]);

  const query = activeSearch.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!query) return items;
    return items.filter((item) =>
      [item.connection_name, item.license_key, item.license_type, item.domain_name]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query)),
    );
  }, [items, query]);

  function handleSearch() {
    setActiveSearch(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput("");
    setActiveSearch("");
  }

  const groups = useMemo<ConnectionGroup[]>(() => {
    const byConnection = new Map<string, ConnectionGroup>();
    for (const item of filteredItems) {
      const connectionName = item.connection_name ?? "(알 수 없음)";
      if (!byConnection.has(connectionName)) {
        byConnection.set(connectionName, { connectionName, items: [] });
      }
      byConnection.get(connectionName)!.items.push(item);
    }
    return Array.from(byConnection.values());
  }, [filteredItems]);

  function toggleItem(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setGroupItems(groupItems: VcfOpsCoreLicenseItem[], select: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of groupItems) {
        if (select) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  }

  function selectionState(groupItems: VcfOpsCoreLicenseItem[]): { checked: boolean; indeterminate: boolean } {
    const selectedCount = groupItems.filter((item) => selected.has(item.id)).length;
    return {
      checked: selectedCount === groupItems.length && groupItems.length > 0,
      indeterminate: selectedCount > 0 && selectedCount < groupItems.length,
    };
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleAssign() {
    setSubmitting(true);
    setError(null);
    try {
      await assignVcfOpsItemsToProject(project.id, Array.from(selected));
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
        <h2>{project.name} — VCF 할당</h2>
        <p className="text-muted">
          VCF Operations 연결을 체크하면 하위 라이센스 항목이 모두 선택됩니다. 연결 이름을 클릭하면
          하위 목록이 펼쳐집니다.
        </p>
        {error && <p className="error-text">{error}</p>}
        {!loading && items.length > 0 && (
          <div className="search-bar">
            <input
              type="text"
              placeholder="연결 / License Key / License Type / Domain 검색"
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
              할당 가능한 VCF 항목이 없습니다. 설정 &gt; VCF 탭에서 먼저 VCF Operations 연결을
              추가해주세요.
            </p>
          ) : groups.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              검색 결과가 없습니다.
            </p>
          ) : (
            <div className="vc-tree">
              {groups.map((group) => {
                const gKey = group.connectionName;
                const gExpanded = query ? true : expanded.has(gKey);
                const gState = selectionState(group.items);
                return (
                  <div key={gKey}>
                    <div className="vc-tree-row level-vcenter">
                      <button className="vc-tree-toggle" onClick={() => toggleExpanded(gKey)}>
                        {gExpanded ? "▾" : "▸"}
                      </button>
                      <TriCheckbox
                        checked={gState.checked}
                        indeterminate={gState.indeterminate}
                        onChange={() => setGroupItems(group.items, !gState.checked)}
                      />
                      <span style={{ cursor: "pointer" }} onClick={() => toggleExpanded(gKey)}>
                        {group.connectionName}
                      </span>
                    </div>

                    {gExpanded &&
                      group.items.map((item) => (
                        <div key={item.id} className="vc-tree-row level-host">
                          <span style={{ width: 16 }} />
                          <input
                            type="checkbox"
                            checked={selected.has(item.id)}
                            onChange={() => toggleItem(item.id)}
                          />
                          <div className="vc-tree-host-cols">
                            <span>{item.license_key ?? "-"}</span>
                            <span>{item.license_type ?? "-"}</span>
                            <span>할당 {item.core_capacity ?? "-"}</span>
                            <span>사용 {item.core_used ?? "-"}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
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

export default VcfOpsAssignModal;
