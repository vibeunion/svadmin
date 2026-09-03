export { cn } from 'cn';

const RESOURCE_PROTOCOLS = new Set(['http:', 'https:', 'blob:']);

export type SnippetLike = import('svelte').Snippet;

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
