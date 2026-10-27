interface Props {
  licenseType: string | null;
}

function LicenseTypeBadge({ licenseType }: Props) {
  const normalized = (licenseType ?? "").toUpperCase();
  if (normalized === "PERPETUAL") {
    return <span className="badge badge-perpetual">Perpetual</span>;
  }
  if (normalized === "SUBSCRIPTION") {
    return <span className="badge badge-subscription">Subscription</span>;
  }
  return <span className="badge badge-other">{licenseType ?? "-"}</span>;
}

export default LicenseTypeBadge;
