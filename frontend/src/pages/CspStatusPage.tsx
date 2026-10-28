import { useEffect, useMemo, useState } from "react";

import { fetchCspData, fetchProjects } from "../api/client";
import ListControls from "../components/ListControls";
import Pagination from "../components/Pagination";
import SummaryBar from "../components/SummaryBar";
import { useListControls } from "../hooks/useListControls";
import type { CspLicenseItem, ProjectSummary } from "../types";

function isExpired(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date(new Date().toDateString());
}

function CspStatusPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [items, setItems] = useState<CspLicenseItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects().then((data) =>
      setProjects([...data].sort((a, b) => a.name.localeCompare(b.name))),
    );
  }, []);

  useEffect(() => {
    if (selectedProjectId === null) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetchCspData({ assignedToProject: selectedProjectId })
      .then(setItems)
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const folderCount = new Set(items.map((item) => item.folder_name ?? "(알 수 없음)")).size;

  const quantityByUnit = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of items) {
      const unit = item.unit ?? "(알 수 없음)";
      totals.set(unit, (totals.get(unit) ?? 0) + item.quantity);
    }
    return Array.from(totals.entries());
  }, [items]);

  const list = useListControls(items, (item, query) =>
    [item.folder_name, item.product_name, item.license_key]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(query)),
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="form-field" style={{ maxWidth: 320 }}>
          <label>프로젝트 선택</label>
          <select
            value={selectedProjectId ?? ""}
            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{projects.length === 0 ? "생성된 프로젝트가 없습니다" : "선택 없음"}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted">불러오는 중...</p>
      ) : projects.length === 0 ? (
        <div className="card placeholder-card">프로젝트를 먼저 생성해주세요.</div>
      ) : selectedProjectId === null ? (
        <div className="card placeholder-card">프로젝트를 선택해주세요.</div>
      ) : (
        <>
          {items.length === 0 ? (
            <div className="card placeholder-card">
              이 프로젝트에 CSP 할당 정보가 없습니다. 설정 &gt; 프로젝트 탭에서 "CSP 할당"으로
              추가해주세요.
            </div>
          ) : (
            <div className="card">
              <SummaryBar
                items={[
                  { label: "Folder 수", value: folderCount },
                  { label: "라이센스 항목 수", value: items.length },
                  ...quantityByUnit.map(([unit, qty]) => ({
                    label: `Quantity (${unit})`,
                    value: qty,
                  })),
                ]}
              />
              <ListControls
                search={list.search}
                onSearchChange={list.setSearch}
                pageSize={list.pageSize}
                onPageSizeChange={list.setPageSize}
                total={list.total}
                placeholder="Folder Name / Product Name / License Key 검색"
              />
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Folder Name</th>
                      <th>Product Name</th>
                      <th>License Key</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Contract End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.pageItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.folder_name ?? "-"}</td>
                        <td>{item.product_name ?? "-"}</td>
                        <td>{item.license_key ?? "-"}</td>
                        <td>{item.quantity.toLocaleString()}</td>
                        <td>{item.unit ?? "-"}</td>
                        <td>
                          {item.contract_end_date ?? "-"}{" "}
                          {isExpired(item.contract_end_date) && (
                            <span className="badge badge-error">만료</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={list.page}
                totalPages={list.totalPages}
                onPageChange={list.setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CspStatusPage;
