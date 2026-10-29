export function isVSphereProduct(productName: string | null | undefined): boolean {
  const name = (productName ?? "").trim().toLowerCase();
  return name.startsWith("vmware vsphere") || name.startsWith("vsphere");
}

export function isVmwareCloudFoundationLicense(licenseKey: string | null | undefined): boolean {
  const key = (licenseKey ?? "").trim().toLowerCase();
  return key.startsWith("vmware cloud foundation");
}

/** The two VCF license entitlements assignable to a project - the core
 * Cloud Foundation platform license and the vSphere Foundation edition. */
export function isVcfAssignableLicense(licenseKey: string | null | undefined): boolean {
  const key = (licenseKey ?? "").trim().toLowerCase();
  return key.startsWith("vmware cloud foundation") || key.startsWith("vmware vsphere foundation");
}
