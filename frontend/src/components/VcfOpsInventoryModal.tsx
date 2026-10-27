import { useEffect, useState } from "react";

import { fetchVcfOpsInventory } from "../api/client";
import type { VcfOpsConnection, VcfOpsCoreLicenseItem } from "../types";

interface Props {
  connection: VcfOpsConnection;
  onClose: () => void;
}

function VcfOpsInventoryModal({ connection, onClose }: Props) {
  const [items, setItems] = useState<VcfOpsCoreLicenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVcfOpsInventory(connection.id)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [connection.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box large" onClick={(e) => e.stopPropagation()}>
        <h2>{connection.name} 인벤토리</h2>
        <p className="text-muted">{connection.host} 수집 결과 ({items.length}건)</p>

        <div className="modal-scroll">
          {loading ? (
            <p style={{ padding: 16 }}>불러오는 중...</p>
          ) : items.length === 0 ? (
            <p style={{ padding: 16 }} className="text-muted">
              수집된 항목이 없습니다.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>License Key</th>
                  <th>License Type</th>
                  <th>상태</th>
                  <th>할당된 코어 수</th>
                  <th>사용 중인 코어 수</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.domain_name ?? "-"}</td>
                    <td>{item.license_key ?? "-"}</td>
                    <td>{item.license_type ?? "-"}</td>
                    <td>{item.license_status ?? "-"}</td>
                    <td>{item.core_capacity ?? "-"}</td>
                    <td>{item.core_used ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default VcfOpsInventoryModal;
