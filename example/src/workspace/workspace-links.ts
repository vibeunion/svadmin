export function recordLink(resource: string, id: string | number, currentPath: string): string {
  const path = currentPath.replace(/^#/, '');
  const returnTo = path.startsWith('/') && !path.startsWith('//') ? path : '/';
  return `#/${encodeURIComponent(resource)}/show/${encodeURIComponent(id)}?${new URLSearchParams({ returnTo })}`;
}
