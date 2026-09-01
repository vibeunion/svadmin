export type OpenInProvider = 'chatgpt' | 'claude' | 'cursor' | 'github' | 'scira' | 't3' | 'v0';

export interface OpenInProviderDefinition {
  title: string;
  createUrl(query: string): string | undefined;
}

export function safeExternalUrl(input: string, allowedHosts?: readonly string[]): string | undefined {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    if (allowedHosts?.length && !allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function queryUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

export const providers: Record<OpenInProvider, OpenInProviderDefinition> = {
  chatgpt: { title: 'Open in ChatGPT', createUrl: (prompt) => queryUrl('https://chatgpt.com/', { hints: 'search', prompt }) },
  claude: { title: 'Open in Claude', createUrl: (q) => queryUrl('https://claude.ai/new', { q }) },
  cursor: { title: 'Open in Cursor', createUrl: (text) => queryUrl('https://cursor.com/link/prompt', { text }) },
  github: { title: 'Open in GitHub', createUrl: (url) => safeExternalUrl(url, ['github.com']) },
  scira: { title: 'Open in Scira', createUrl: (q) => queryUrl('https://scira.ai/', { q }) },
  t3: { title: 'Open in T3 Chat', createUrl: (q) => queryUrl('https://t3.chat/new', { q }) },
  v0: { title: 'Open in v0', createUrl: (q) => queryUrl('https://v0.app/', { q }) },
};
