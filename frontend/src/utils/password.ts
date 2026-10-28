// Excludes visually ambiguous characters (I/l/1, O/0) to keep generated
// passwords easy to read and re-type.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SPECIAL = "!@#$%^&*-_=+?";

function randomInt(max: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

function pick(chars: string): string {
  return chars[randomInt(chars.length)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Generates an 8-12 character password containing at least one uppercase,
 * one lowercase, one digit, and one special character. */
export function generatePassword(): string {
  const length = 8 + randomInt(5); // 8..12
  const all = UPPER + LOWER + DIGITS + SPECIAL;
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => pick(all));
  return shuffle([...required, ...rest]).join("");
}
