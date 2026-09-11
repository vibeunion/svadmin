export function requireValue<T>(value: T | null | undefined): T {
  if (value === undefined || value === null) throw new Error('Expected a present test value');
  return value;
}
