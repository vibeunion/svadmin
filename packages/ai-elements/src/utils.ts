export { cn } from './classnames.js';

const RESOURCE_PROTOCOLS = new Set(['http:', 'https:', 'blob:']);

export type SnippetLike = import('svelte').Snippet;

/**
 * Deterministic compact number formatting (`1250 -> "1.3K"`).
 *
 * `Intl.NumberFormat({ notation: 'compact' })` silently degrades to plain digits
 * on small-ICU runtimes, so the same usage string read "1250" in one environment
 * and "1.3K" in another. Token counters must read the same everywhere.
 */
export function formatCompactNumber(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return '-';
  const units: ReadonlyArray<readonly [number, string]> = [
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
    [1_000, 'K'],
  ];
  for (const [scale, suffix] of units) {
    if (Math.abs(value) < scale) continue;
    return `${Math.round((value / scale) * 10) / 10}${suffix}`;
  }
  return String(value);
}

export function stopPropagation(event: Event): void {
  event.stopPropagation();
}

export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value
    && typeof (value as { then?: unknown }).then === 'function';
}

export function safeResourceUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return RESOURCE_PROTOCOLS.has(parsed.protocol) ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}
