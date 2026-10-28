import { describe, expect, test } from 'vitest';
import { projectInteractionRecord, projectInteractionValues, SURFACE_INTERACTION_MAX_CHARACTERS } from './interactions.js';
import type { JsonObject } from './types.js';

describe('surface interaction record projection', () => {
  test('keeps only declared fields and returns a detached copy', () => {
    const record: Record<string, unknown> = { id: 1, name: 'Marker', stock: 12, secret: 'hidden' };
    const projected = projectInteractionRecord(record as JsonObject, ['id', 'name']);
    expect(projected).toEqual({ id: 1, name: 'Marker' });
    record['name'] = 'Changed';
    expect(projected?.['name']).toBe('Marker');
  });

  test('skips missing and non-JSON values instead of converting them', () => {
    const record = {
      id: 2,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      count: Number.NaN,
      missingReference: () => 1,
      name: 'Notebook',
      nested: { ok: true },
    };
    expect(projectInteractionRecord(record as unknown as JsonObject, ['id', 'createdAt', 'count', 'missingReference', 'name', 'nested']))
      .toEqual({ id: 2, name: 'Notebook', nested: { ok: true } });
  });

  test('returns null when no declared field can be delivered', () => {
    expect(projectInteractionRecord({ createdAt: new Date() } as unknown as JsonObject, ['createdAt', 'absent'])).toBeNull();
    expect(projectInteractionRecord({ id: 1 }, [])).toBeNull();
  });

  test('never copies dangerous property names', () => {
    const record = JSON.parse('{"__proto__": {"polluted": true}, "id": 3}') as JsonObject;
    expect(projectInteractionRecord(record, ['__proto__', 'constructor', 'id'])).toEqual({ id: 3 });
  });

  test('detaches nested objects and arrays from the source record', () => {
    const nested = { sku: 'A-1', tags: ['ink'] };
    const record: Record<string, unknown> = { id: 4, details: nested };
    const projected = projectInteractionRecord(record as JsonObject, ['id', 'details']);
    nested.sku = 'changed';
    nested.tags.push('secret');
    expect(projected).toEqual({ id: 4, details: { sku: 'A-1', tags: ['ink'] } });
  });
});

describe('surface interaction value projection', () => {
  test('detaches component values', () => {
    const values = JSON.parse('{"name":"Ada","meta":{"ok":true}}') as JsonObject;
    const projected = projectInteractionValues(values);
    expect(projected).toEqual({ name: 'Ada', meta: { ok: true } });
    if (projected !== null) (projected as Record<string, unknown>)['name'] = 'Changed';
    expect((values as Record<string, unknown>)['name']).toBe('Ada');
  });

  test('fails closed for dangerous keys instead of stripping them', () => {
    const values = JSON.parse('{"name":"Ada","__proto__":{"polluted":true}}') as JsonObject;
    expect(projectInteractionValues(values)).toBeNull();
  });

  test('fails closed for non-JSON and oversized values', () => {
    expect(projectInteractionValues({ at: new Date() } as unknown as JsonObject)).toBeNull();
    expect(projectInteractionValues({ big: 'x'.repeat(SURFACE_INTERACTION_MAX_CHARACTERS) })).toBeNull();
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(projectInteractionValues(circular as unknown as JsonObject)).toBeNull();
  });
});
