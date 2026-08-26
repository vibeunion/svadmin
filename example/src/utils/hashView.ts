export function readHashParam(name: string): string | null {
  if (typeof window === 'undefined') return null;

  const query = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(query).get(name);
}

export function readHashView(defaultView = 'default'): string {
  return readHashParam('view') ?? defaultView;
}

export function replaceHashParam(name: string, value: string | null): void {
  if (typeof window === 'undefined') return;

  const [path, query = ''] = window.location.hash.split('?');
  const params = new URLSearchParams(query);
  if (value === null) params.delete(name);
  else params.set(name, value);

  const nextQuery = params.toString();
  const url = new URL(window.location.href);
  url.hash = `${path || '#/'}${nextQuery ? `?${nextQuery}` : ''}`;
  window.history.replaceState(window.history.state, '', url);
}
