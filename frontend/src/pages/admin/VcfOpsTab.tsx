import { useEffect, useState } from "react";

import {
  deleteVcfOpsConnection,
  fetchVcfOpsConnections,
  syncVcfOpsConnection,
  updateVcfOpsSyncInterval,
} from "../../api/client";
import ConnectVcfOpsModal from "../../components/ConnectVcfOpsModal";
import SyncIntervalModal from "../../components/SyncIntervalModal";
import VcfOpsInventoryModal from "../../components/VcfOpsInventoryModal";
import type { VcfOpsConnection } from "../../types";

function StatusBadge({ status }: { status: VcfOpsConnection["status"] }) {
  if (status === "connected") return <span className="badge badge-success">연결됨</span>;
  if (status === "failed") return <span className="badge badge-error">실패</span>;
  return <span className="badge badge-pending">대기</span>;
}

function VcfOpsTab() {
  const [connections, setConnections] = useState<VcfOpsConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [inventoryTarget, setInventoryTarget] = useState<VcfOpsConnection | null>(null);
  const [intervalTarget, setIntervalTarget] = useState<VcfOpsConnection | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadConnections() {
    fetchVcfOpsConnections()
      .then(setConnections)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadConnections();
  }, []);

  async function handleSync(connection: VcfOpsConnection) {
    setSyncingId(connection.id);
    setError(null);
    try {
      await syncVcfOpsConnection(connection.id);
      loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "동기화에 실패했습니다.");
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDelete(connection: VcfOpsConnection) {
    if (!window.confirm(`${connection.name} 연결을 삭제할까요?`)) return;
    try {
      await deleteVcfOpsConnection(connection.id);
      loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  return (
    <div>
      <div className="form-row" style={{ justifyContent: "space-between" }}>
        <p className="text-muted" style={{ margin: 0 }}>
          VCF 9 Operations와 연결하여 코어 라이센스 할당/사용 현황을 수집합니다.
        </p>
        <button className="btn" onClick={() => setShowConnectModal(true)}>
          VCF Operations 연결
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card" style={{ marginTop: 16 }}>
        {loading ? (
          <p className="text-muted">불러오는 중...</p>
        ) : connections.length === 0 ? (
          <p className="text-muted">연결된 VCF Operations가 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Ops 연결 이름</th>
                <th>Host</th>
                <th>버전</th>
                <th>상태</th>
                <th>수집된 라이센스 수</th>
                <th>마지막 동기화</th>
                <th>동기화 주기</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {connections.map((connection) => (
                <tr key={connection.id}>
                  <td>{connection.name}</td>
                  <td>{connection.host}</td>
                  <td>{connection.detected_version ?? "-"}</td>
                  <td>
                    <StatusBadge status={connection.status} />
                  </td>
                  <td>{connection.license_count}</td>
                  <td>
                    {connection.last_synced_at
                      ? new Date(connection.last_synced_at).toLocaleString()
                      : "-"}
                  </td>
                  <td>{connection.sync_interval_minutes}분</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setInventoryTarget(connection)}
                    >
                      인벤토리 현황
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleSync(connection)}
                      disabled={syncingId === connection.id}
                    >
                      {syncingId === connection.id ? "동기화 중..." : "동기화"}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setIntervalTarget(connection)}
                    >
                      동기화 주기 설정
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(connection)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {connections.some((c) => c.status === "failed") && (
          <div style={{ marginTop: 16 }}>
            {connections
              .filter((c) => c.status === "failed" && c.last_error)
              .map((c) => (
                <p key={c.id} className="error-text">
                  {c.name}: {c.last_error}
                </p>
              ))}
          </div>
        )}
      </div>

      {showConnectModal && (
        <ConnectVcfOpsModal
          onClose={() => setShowConnectModal(false)}
          onConnected={loadConnections}
        />
      )}
      {inventoryTarget && (
        <VcfOpsInventoryModal
          connection={inventoryTarget}
          onClose={() => setInventoryTarget(null)}
        />
      )}
      {intervalTarget && (
        <SyncIntervalModal
          connectionName={intervalTarget.name}
          currentMinutes={intervalTarget.sync_interval_minutes}
          onClose={() => setIntervalTarget(null)}
          onSave={async (minutes) => {
            await updateVcfOpsSyncInterval(intervalTarget.id, minutes);
            loadConnections();
          }}
        />
      )}
    </div>
  );
}

export default VcfOpsTab;
