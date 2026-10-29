import { useMemo } from "react";

import type { CspLicenseItem, LicenseItem, VCenterInventoryItem, VcfOpsCoreLicenseItem } from "../types";
import {
  colorForClassificationIndex,
  foldClassificationToOther,
  normalizePerpetualSubscription,
  sumByClassification,
  sumExpiryByClassification,
  sumVCenterLicenseUsageByCategory,
  sumVcfCapacityAndUsed,
} from "../utils/licenseStats";
import { isVmwareCloudFoundationLicense, isVSphereProduct } from "../utils/vsphere";
import DonutChart from "./DonutChart";

const COLOR_NORMAL = "#2563eb";
const COLOR_EXPIRED = "#dc2626";
const COLOR_TRACK = "#e1e0d9";

interface Props {
  supplierItems: LicenseItem[];
  cspItems: CspLicenseItem[];
  vcenterItems: VCenterInventoryItem[];
  vcfItems: VcfOpsCoreLicenseItem[];
}

function LicenseStatusCharts({ supplierItems, cspItems, vcenterItems, vcfItems }: Props) {
  // Supplier and CSP figures only count genuine vSphere products ("VMware
  // vSphere..." / "vSphere..."), matching the same filter used by the
  // assign modals - other products (NSX, Aria, vSAN, etc.) are excluded.
  const vSphereSupplierItems = useMemo(
    () => supplierItems.filter((item) => isVSphereProduct(item.product_name)),
    [supplierItems],
  );
  const vSphereCspItems = useMemo(
    () => cspItems.filter((item) => isVSphereProduct(item.product_name)),
    [cspItems],
  );
  // VCF figures only count the core VMware Cloud Foundation entitlement,
  // excluding add-ons (vSAN, Private AI Foundation, etc.) billed under the
  // same connection.
  const cloudFoundationVcfItems = useMemo(
    () => vcfItems.filter((item) => isVmwareCloudFoundationLicense(item.license_key)),
    [vcfItems],
  );

  const supplierExpiryByType = useMemo(
    () =>
      sumExpiryByClassification(
        vSphereSupplierItems,
        (item) => item.license_type,
        (item) => item.end_date,
        (item) => item.quantity_ent,
        normalizePerpetualSubscription,
      ),
    [vSphereSupplierItems],
  );
  const cspExpiryByUnit = useMemo(
    () =>
      sumExpiryByClassification(
        vSphereCspItems,
        (item) => item.unit,
        (item) => item.contract_end_date,
        (item) => item.quantity,
      ),
    [vSphereCspItems],
  );

  const supplierTypeSegments = useMemo(
    () =>
      foldClassificationToOther(
        sumByClassification(
          vSphereSupplierItems,
          (item) => item.license_type,
          (item) => item.quantity_ent,
          normalizePerpetualSubscription,
        ),
      ),
    [vSphereSupplierItems],
  );
  const vcenterTypeSegments = useMemo(
    () => foldClassificationToOther(sumVCenterLicenseUsageByCategory(vcenterItems)),
    [vcenterItems],
  );
  const vcfUsage = useMemo(() => sumVcfCapacityAndUsed(cloudFoundationVcfItems), [cloudFoundationVcfItems]);
  const vcfRemaining = Math.max(vcfUsage.capacity - vcfUsage.used, 0);
  const vcfUsageRate =
    vcfUsage.capacity > 0 ? Math.round((vcfUsage.used / vcfUsage.capacity) * 100) : 0;
  const cspUnitSegments = useMemo(
    () =>
      foldClassificationToOther(
        sumByClassification(vSphereCspItems, (item) => item.unit, (item) => item.quantity),
      ),
    [vSphereCspItems],
  );

  return (
    <>
      <div className="donut-grid">
        {supplierExpiryByType.map((group) => (
          <DonutChart
            key={`supplier-${group.key}`}
            title={`공급자 ${group.label} 만료 현황 (수량)`}
            segments={[
              { label: "유지", value: group.normal, color: COLOR_NORMAL },
              { label: "만료", value: group.expired, color: COLOR_EXPIRED },
            ]}
            centerValue={(group.normal + group.expired).toLocaleString()}
            centerLabel="전체 수량"
          />
        ))}
        {cspExpiryByUnit.map((group) => (
          <DonutChart
            key={`csp-${group.key}`}
            title={`CSP ${group.label} 만료 현황 (수량)`}
            segments={[
              { label: "유지", value: group.normal, color: COLOR_NORMAL },
              { label: "만료", value: group.expired, color: COLOR_EXPIRED },
            ]}
            centerValue={(group.normal + group.expired).toLocaleString()}
            centerLabel="전체 수량"
          />
        ))}
      </div>

      <div className="donut-grid">
        <DonutChart
          title="공급자 유형별 수량"
          segments={supplierTypeSegments.map((seg, i) => ({
            label: seg.label,
            value: seg.count,
            color: colorForClassificationIndex(i),
          }))}
          centerValue={supplierTypeSegments.reduce((sum, s) => sum + s.count, 0).toLocaleString()}
          centerLabel="전체 수량"
        />
        <DonutChart
          title="vCenter 유형별 라이센스 사용 수량"
          segments={vcenterTypeSegments.map((seg, i) => ({
            label: seg.label,
            value: seg.count,
            color: colorForClassificationIndex(i),
          }))}
          centerValue={vcenterTypeSegments.reduce((sum, s) => sum + s.count, 0).toLocaleString()}
          centerLabel="전체 수량"
        />
        <DonutChart
          title="VCF (VMware Cloud Foundation) 코어 사용 현황"
          segments={[
            { label: "사용 코어", value: vcfUsage.used, color: COLOR_NORMAL },
            { label: "여유 코어", value: vcfRemaining, color: COLOR_TRACK },
          ]}
          centerValue={`${vcfUsageRate}%`}
          centerLabel={`${vcfUsage.used.toLocaleString()} / ${vcfUsage.capacity.toLocaleString()}`}
        />
        <DonutChart
          title="CSP 유형별 수량"
          segments={cspUnitSegments.map((seg, i) => ({
            label: seg.label,
            value: seg.count,
            color: colorForClassificationIndex(i),
          }))}
          centerValue={cspUnitSegments.reduce((sum, s) => sum + s.count, 0).toLocaleString()}
          centerLabel="전체 수량"
        />
      </div>
    </>
  );
}

export default LicenseStatusCharts;
