import { describe, expect, test } from 'vitest';
import { projectInteractionRecord } from './interactions.js';
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
