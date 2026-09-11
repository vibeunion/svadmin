export type ParsedResourceAction =
  | { action: 'list' | 'create' }
  | { action: 'edit' | 'show' | 'clone'; id: string };

export function parseResourceActionSegments(restSegments: string[]): ParsedResourceAction {
  const [first, second] = restSegments;
  if (first === undefined) return { action: 'list' };
  if (first === 'create') return { action: 'create' };
  if ((first === 'edit' || first === 'show' || first === 'clone') && second) {
    return { action: first, id: second };
  }
  if (second === 'edit') return { action: 'edit', id: first };
  return { action: 'show', id: first };
}
