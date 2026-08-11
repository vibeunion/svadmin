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
