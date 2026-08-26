export type ParsedResourceAction = {
  action: 'list' | 'create' | 'edit' | 'show' | 'clone';
  id?: string;
};

export function parseResourceActionSegments(restSegments: string[]): ParsedResourceAction {
  if (restSegments.length === 0) return { action: 'list' };
  if (restSegments[0] === 'create') return { action: 'create' };
  if (restSegments[0] === 'edit' && restSegments[1]) return { action: 'edit', id: restSegments[1] };
  if (restSegments[0] === 'show' && restSegments[1]) return { action: 'show', id: restSegments[1] };
  if (restSegments[0] === 'clone' && restSegments[1]) return { action: 'clone', id: restSegments[1] };
  if (restSegments[1] === 'edit') return { action: 'edit', id: restSegments[0] };
  return { action: 'show', id: restSegments[0] };
}
