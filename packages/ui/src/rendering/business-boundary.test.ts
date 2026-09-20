import { describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { defineResource } from '@svadmin/core/resource-contract';
import { bindResourceRendering, createResourceRenderers } from './index.js';

const contract = defineResource('items', {
  record: Type.Object({ id: Type.Number(), name: Type.String() }),
  create: Type.Object({ name: Type.String() }),
  update: Type.Object({ name: Type.Optional(Type.String()) }),
});
const ui = createResourceRenderers(contract);

describe('native business rendering boundaries', () => {
  it('validates complete arrays and returns detached snapshots', () => {
    const rows = [{ id: 1, name: 'Before' }];
    const checked = ui.records(rows);
    const first = rows[0];
    if (!first) throw new Error('Missing fixture');
    first.name = 'After';
    expect(checked).toEqual([{ id: 1, name: 'Before' }]);
    expect(() => ui.records([...rows, { id: 2, name: 3 }])).toThrow();
    expect(() => ui.records({ data: rows })).toThrow();
  });
  it('does not evaluate getter records or accept sparse arrays', () => {
    const getter = vi.fn(() => ({ id: 1, name: 'Unsafe' }));
    const rows = Object.defineProperty([], '0', { get: getter, enumerable: true });
    expect(() => ui.records(rows)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(() => ui.records(Array(2))).toThrow();
  });
  it('checks operation-specific draft shape without pretending unfinished values are valid', () => {
    expect(ui.draft('create', { name: 42 })).toEqual({ name: 42 });
    expect(ui.draft('edit', {})).toEqual({});
    expect(() => ui.draft('edit', { id: 1 })).toThrow();
    expect(() => ui.draft('create', { name: new Date() })).toThrow();
    expect(() => ui.draft('clone', { unknown: 1 })).toThrow();
  });
  it('binds by identity, not the resource label, and is optional for legacy consumers', () => {
    expect(bindResourceRendering(ui, contract)).toBe(ui);
    expect(bindResourceRendering(undefined, contract)).toBeUndefined();
    const other = defineResource('items', { record: Type.Object({ id: Type.Number() }) });
    expect(() => bindResourceRendering(ui, other)).toThrow('contract mismatch');
  });
});
