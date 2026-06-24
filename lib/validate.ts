/** Small, pure validation helpers shared across forms (unit-tested in lib/validate.test.ts). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Returns a problem message if the password is unacceptable, or null if it's fine. */
export function passwordIssue(password: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.';
  return null;
}

/** Whole years between a YYYY-MM-DD date of birth and `now`, or null if the date is invalid. */
export function ageFromDob(dob: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  let age = now.getFullYear() - y;
  const beforeBirthday = now.getMonth() < mo - 1 || (now.getMonth() === mo - 1 && now.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

/** Parse a user-entered NGN amount into integer kobo/cents (0 on invalid input). */
export function parseAmountToCents(input: string): number {
  const n = parseFloat(input);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}
