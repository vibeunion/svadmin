import { snapshotLiveEvent, type LiveEvent } from '../live-transport';

const types: Record<string, LiveEvent['type']> = {
  created: 'INSERT', updated: 'UPDATE', deleted: 'DELETE',
  insert: 'INSERT', update: 'UPDATE', delete: 'DELETE',
  INSERT: 'INSERT', UPDATE: 'UPDATE', DELETE: 'DELETE',
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Normalize provider payloads that carry a type name and a payload object. */
export function liveEventFrom(value: unknown, resource: string, typeHint?: string): LiveEvent | undefined {
  const hinted = typeHint ?? (isRecord(value) && typeof value['type'] === 'string' ? value['type'] : undefined);
  const type = hinted === undefined ? undefined : types[hinted];
  if (!type) return undefined;
  const payload = isRecord(value) && 'payload' in value ? value['payload'] : value;
  const target = isRecord(value) && typeof value['resource'] === 'string' ? value['resource'] : resource;
  return snapshotLiveEvent({ type, resource: target, payload: isRecord(payload) ? payload : {} });
}