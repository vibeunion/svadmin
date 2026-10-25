export interface SavedIdsReadResult {
  ids: number[];
  status: 'ready' | 'error';
}

export function readSavedIdsResult(key: string): SavedIdsReadResult {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return { ids: [], status: 'ready' };
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every((id): id is number => typeof id === 'number' && Number.isSafeInteger(id))) {
      return { ids: [], status: 'error' };
    }
    return { ids: value, status: 'ready' };
  } catch {
    return { ids: [], status: 'error' };
  }
}

export function readSavedIds(key: string): number[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id)) : [];
  } catch { return []; }
}

export function saveIds(key: string, ids: number[]): boolean {
  try { sessionStorage.setItem(key, JSON.stringify(ids)); return true; }
  catch { return false; }
}
