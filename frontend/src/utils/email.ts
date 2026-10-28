// Minimal format check per spec: exactly one "@", with at least one
// character before and after it.
export function isValidEmailFormat(value: string): boolean {
  const at = value.indexOf("@");
  if (at <= 0) return false;
  if (value.indexOf("@", at + 1) !== -1) return false;
  return at < value.length - 1;
}
