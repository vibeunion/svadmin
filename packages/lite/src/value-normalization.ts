const TRUE_BOOLEAN_STRINGS = new Set(['1', 'true', 'on']);
const FALSE_BOOLEAN_STRINGS = new Set(['0', 'false', 'off']);

export function parseExplicitBoolean(rawBoolean: unknown): boolean | undefined {
  if (typeof rawBoolean === 'boolean') return rawBoolean;
  if (rawBoolean === 1) return true;
  if (rawBoolean === 0) return false;
  if (typeof rawBoolean !== 'string') return undefined;

  const normalizedBoolean = rawBoolean.trim().toLowerCase();
  if (TRUE_BOOLEAN_STRINGS.has(normalizedBoolean)) return true;
  if (FALSE_BOOLEAN_STRINGS.has(normalizedBoolean)) return false;
  return undefined;
}

export function isExplicitBooleanTrue(rawBoolean: unknown): boolean {
  return parseExplicitBoolean(rawBoolean) === true;
}

export function getStatusBadgeClass(value: unknown): string {
  if (typeof value !== "string") return "lite-badge";
  const v = value.toLowerCase().trim();
  if (["active", "completed", "published", "delivered", "paid", "approved", "success", "in_stock", "healthy"].includes(v)) {
    return "lite-badge lite-badge-success";
  }
  if (["draft", "pending", "processing", "in_transit", "review", "waiting", "warning", "low_stock"].includes(v)) {
    return "lite-badge lite-badge-warning";
  }
  if (["cancelled", "rejected", "failed", "suspended", "inactive", "banned", "error", "out_of_stock", "closed"].includes(v)) {
    return "lite-badge lite-badge-danger";
  }
  if (["shipped", "submitted", "open", "new", "admin", "verified"].includes(v)) {
    return "lite-badge lite-badge-info";
  }
  return "lite-badge";
}
