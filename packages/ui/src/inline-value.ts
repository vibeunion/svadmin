import { numericInputValue } from './numeric-input';

export function inlineDisplayValue(type: string, value: unknown): { text: string; value: string | number | null } | undefined {
  if (!['number', 'text', 'email', 'url'].includes(type)) return undefined;
  if (value === null || value === undefined) return { text: '', value: null };
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
    ? { text: String(value), value } : undefined;
  return typeof value === 'string' ? { text: value, value } : undefined;
}

export function parseInlineValue(type: string, text: string): string | number | null {
  if (type === 'number') {
    const value = text.trim();
    if (!value) return null;
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) throw new TypeError('Invalid numeric input');
    return numericInputValue(Number(value));
  }
  if (type === 'text' || type === 'email' || type === 'url') return text;
  throw new TypeError('Unsupported inline field');
}
