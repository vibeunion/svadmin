import { createContext } from 'svelte';

export const DEFAULT_WEB_PREVIEW_SANDBOX = 'allow-scripts';

export type WebPreviewNavigationAction = 'back' | 'forward' | 'reload' | 'console';
export interface WebPreviewContextValue {
  readonly url: string;
  readonly safeUrl: string;
  readonly srcdoc?: string;
  readonly sandbox: string;
  readonly title: string;
  readonly loading: boolean;
  readonly revision: number;
  readonly consoleOpen: boolean;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  navigate(url: string): boolean;
  back(): void;
  forward(): void;
  reload(): void;
  setConsoleOpen(open: boolean): void;
  frameLoaded(): void;
}

const [getWebPreviewContext, setWebPreviewContext] = createContext<WebPreviewContextValue>();
export function provideWebPreviewContext(value: WebPreviewContextValue): WebPreviewContextValue { setWebPreviewContext(value); return value; }
export function useWebPreviewContext(component = 'WebPreview component'): WebPreviewContextValue { try { return getWebPreviewContext(); } catch { throw new Error(`${component} must be used within WebPreview`); } }

export function sanitizePreviewUrl(value: string): string {
  const candidate = value.trim();
  if (!candidate) return '';
  if (candidate.startsWith('/') || candidate.startsWith('./') || candidate.startsWith('../')) return candidate;
  try { const parsed = new URL(candidate); return ['http:', 'https:', 'blob:', 'about:'].includes(parsed.protocol) ? candidate : ''; } catch { return '' ; }
}
