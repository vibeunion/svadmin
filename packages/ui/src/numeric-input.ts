/** Empty form values are null; nonempty values must already be finite numbers. */
export function numericInputValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError('Numeric inputs require a finite number or an empty value');
  }
  return value;
}
