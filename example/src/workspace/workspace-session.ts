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
