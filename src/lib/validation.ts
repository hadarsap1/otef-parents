// Input validation helpers
// Book ref: Chapter "Injection Attacks" + "Secure Development Checklist"

/** Trim and enforce max length. Returns null if input is falsy. */
export function sanitizeString(
  input: unknown,
  maxLength = 500
): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

/** Validate that input looks like a CUID (starts with 'c', 25 chars, alphanumeric). */
export function isValidId(input: unknown): input is string {
  return typeof input === "string" && /^c[a-z0-9]{24,}$/.test(input);
}

/** Basic email format check. */
export function isValidEmail(input: unknown): input is string {
  return (
    typeof input === "string" &&
    input.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
  );
}

/** Validate a URL string (http/https only). */
export function isValidUrl(input: unknown): input is string {
  if (typeof input !== "string") return false;
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
