import { useEffect, useMemo, useRef, useState } from "react";

import { assignVCenterItemsToProject, fetchVCenterItems } from "../api/client";
import type { ProjectSummary, VCenterInventoryItem } from "../types";

interface Props {
  project: ProjectSummary;
  onClose: () => void;
  onAssigned: () => void;
}

interface ClusterGroup {
  clusterName: string;
  hosts: VCenterInventoryItem[];
}

interface VCenterGroup {
  vcenterName: string;
  clusters: ClusterGroup[];
  hosts: VCenterInventoryItem[];
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

function VCenterAssignModal({ project, onClose, onAssigned }: Props) {
  const [items, setItems] = useState<VCenterInventoryItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedVCenters, setExpandedVCenters] = useState<Set<string>>(new Set());
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVCenterItems({ assignableForProject: project.id })
      .then((data) => {
        setItems(data);
        setSelected(new Set(data.filter((item) => item.project_id === project.id).map((item) => item.id)));
      })
      .catch(() => setError("할당 가능한 vCenter 항목을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [project.id]);

  const groups = useMemo<VCenterGroup[]>(() => {
    const byVCenter = new Map<string, VCenterGroup>();
    for (const item of items) {
      const vcenterName = item.vcenter_name ?? "(알 수 없음)";
      const clusterName = item.cluster_name ?? "(알 수 없음)";
      if (!byVCenter.has(vcenterName)) {
        byVCenter.set(vcenterName, { vcenterName, clusters: [], hosts: [] });
      }
      const vGroup = byVCenter.get(vcenterName)!;
      vGroup.hosts.push(item);
      let cGroup = vGroup.clusters.find((c) => c.clusterName === clusterName);
      if (!cGroup) {
        cGroup = { clusterName, hosts: [] };
        vGroup.clusters.push(cGroup);
      }
      cGroup.hosts.push(item);
    }
    return Array.from(byVCenter.values());
  }, [items]);

  function toggleHost(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

  function toggleExpanded(set: Set<string>, setter: (s: Set<string>) => void, key: string) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>{project.name} — vCenter 할당</h2>
        <p className="text-muted">
          vCenter 또는 Cluster를 체크하면 하위 Host가 모두 선택됩니다. vCenter/Cluster 이름을
          클릭하면 하위 목록이 펼쳐집니다.
        </p>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-scroll">
          {loading ? (
            <p style={{ padding: 16 }}>불러오는 중...</p>
          ) : groups.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              할당 가능한 vCenter 항목이 없습니다. Legacy Infra 탭에서 먼저 vCenter 어답터를
              연결해주세요.
            </p>
          ) : (
            <div className="vc-tree">
              {groups.map((vGroup) => {
                const vKey = vGroup.vcenterName;
                const vExpanded = expandedVCenters.has(vKey);
                const vState = selectionState(vGroup.hosts);
                return (
                  <div key={vKey}>
                    <div className="vc-tree-row level-vcenter">
                      <button
                        className="vc-tree-toggle"
                        onClick={() => toggleExpanded(expandedVCenters, setExpandedVCenters, vKey)}
                      >
                        {vExpanded ? "▾" : "▸"}
                      </button>
                      <TriCheckbox
                        checked={vState.checked}
                        indeterminate={vState.indeterminate}
                        onChange={() => setHosts(vGroup.hosts, !vState.checked)}
                      />
                      <span
                        style={{ cursor: "pointer" }}
                        onClick={() => toggleExpanded(expandedVCenters, setExpandedVCenters, vKey)}
                      >
                        {vGroup.vcenterName}
                      </span>
                    </div>

                    {vExpanded &&
                      vGroup.clusters.map((cGroup) => {
                        const cKey = `${vKey}::${cGroup.clusterName}`;
                        const cExpanded = expandedClusters.has(cKey);
                        const cState = selectionState(cGroup.hosts);
                        return (
                          <div key={cKey}>
                            <div className="vc-tree-row level-cluster">
                              <button
                                className="vc-tree-toggle"
                                onClick={() =>
                                  toggleExpanded(expandedClusters, setExpandedClusters, cKey)
                                }
                              >
                                {cExpanded ? "▾" : "▸"}
                              </button>
                              <TriCheckbox
                                checked={cState.checked}
                                indeterminate={cState.indeterminate}
                                onChange={() => setHosts(cGroup.hosts, !cState.checked)}
                              />
                              <span
                                style={{ cursor: "pointer" }}
                                onClick={() =>
                                  toggleExpanded(expandedClusters, setExpandedClusters, cKey)
                                }
                              >
                                {cGroup.clusterName}
                              </span>
                            </div>

                            {cExpanded &&
                              cGroup.hosts.map((host) => (
                                <div key={host.id} className="vc-tree-row level-host">
                                  <span style={{ width: 16 }} />
                                  <input
                                    type="checkbox"
                                    checked={selected.has(host.id)}
                                    onChange={() => toggleHost(host.id)}
                                  />
                                  <div className="vc-tree-host-cols">
                                    <span>{host.host_name}</span>
                                    <span>물리 코어 {host.total_cores ?? "-"}</span>
                                    <span>{host.license_key ?? "-"}</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        );
                      })}
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

export default VCenterAssignModal;
