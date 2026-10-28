import { useEffect, useState } from "react";

import { fetchVCenterInventory } from "../api/client";
import LicenseTypeBadge from "./LicenseTypeBadge";
import type { VCenterConnection, VCenterInventoryItem } from "../types";

interface Props {
  connection: VCenterConnection;
  onClose: () => void;
}

function VCenterInventoryModal({ connection, onClose }: Props) {
  const [items, setItems] = useState<VCenterInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVCenterInventory(connection.id)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [connection.id]);

  return (
    <div className="modal-overlay">
      <div className="modal-box large">
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
                  <th>vCenter Name</th>
                  <th>Cluster Name</th>
                  <th>Host Name</th>
                  <th>CPU Sockets</th>
                  <th>Cores / Socket</th>
                  <th>Total Cores</th>
                  <th>License Key</th>
                  <th>라이센스 구분</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.vcenter_name}</td>
                    <td>{item.cluster_name}</td>
                    <td>{item.host_name}</td>
                    <td>{item.cpu_sockets}</td>
                    <td>{item.cores_per_socket}</td>
                    <td>{item.total_cores}</td>
                    <td>{item.license_key}</td>
                    <td>
                      {item.license_category ? (
                        <LicenseTypeBadge licenseType={item.license_category} />
                      ) : (
                        <span className="text-muted">확인 불가</span>
                      )}
                    </td>
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

export default VCenterInventoryModal;
