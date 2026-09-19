import { describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { defineResource } from '@svadmin/core/resource-contract';
import { createResourceRenderers } from './index.js';
import { orders } from '../../../../scripts/fixtures/ui-rendering/resource.js';

describe('rendering validation edge cases', () => {
  it('enforces numeric business constraints even when TypeScript accepts number', () => {
    const onchange = vi.fn();
    const input = { field: { key: 'amount', label: 'Amount', type: 'number' as const }, value: -1, onchange };
    const field = createResourceRenderers(orders).field('create', 'amount', input);
    expect(field.state).toEqual({ valid: false });
    expect(() => field.onchange(-1)).toThrow('Invalid renderer field value');
    expect(onchange).not.toHaveBeenCalled();
    field.onDraftChange(-1);
    expect(onchange).toHaveBeenLastCalledWith(-1);
    field.onchange(0);
    expect(onchange).toHaveBeenLastCalledWith(0);
  });

  it('recognizes nested errors under escaped field names', () => {
    const key = 'profile/name~label';
    const resource = defineResource('profiles', {
      record: Type.Object({ id: Type.Number() }),
      create: Type.Object({ [key]: Type.Object({ title: Type.String() }) }),
    });
    const ui = createResourceRenderers(resource);
    const input = { field: { key, label: 'Profile', type: 'json' as const }, value: { title: 42 }, onchange: vi.fn() };
    expect(ui.field('create', key, input).state).toEqual({ valid: false });
    expect(ui.field('create', key, { ...input, value: { title: 'Checked' } }).state)
      .toEqual({ valid: true, value: { title: 'Checked' } });
  });

  it('forwards a detached field snapshot instead of a mutable caller object', () => {
    const resource = defineResource('profiles', {
      record: Type.Object({ id: Type.Number() }),
      create: Type.Object({ profile: Type.Object({ title: Type.String() }) }),
    });
    const onchange = vi.fn();
    const source = { title: 'Before' };
    const field = createResourceRenderers(resource).field('create', 'profile', {
      field: { key: 'profile', label: 'Profile', type: 'json' }, value: source, onchange,
    });
    field.onchange(source);
    source.title = 'After';
    expect(field.state).toEqual({ valid: true, value: { title: 'Before' } });
    expect(onchange).toHaveBeenLastCalledWith({ title: 'Before' });
  });

  it('does not cache validation based only on mutable record identity', () => {
    const record: Record<string, unknown> = { id: 1, status: 'paid', amount: 1 };
    const ui = createResourceRenderers(orders);
    expect(ui.cell('amount', { record, value: 1 }).value).toBe(1);
    record['amount'] = 'not a number';
    expect(() => ui.cell('amount', { record, value: 1 })).toThrow();
  });

  it('does not swallow errors from the guarded host callback', () => {
    const onchange = vi.fn(() => { throw new Error('Host callback refused update'); });
    const field = createResourceRenderers(orders).field('create', 'status', {
      field: { key: 'status', label: 'Status', type: 'select' }, value: 'paid', onchange,
    });
    expect(() => field.onchange('pending')).toThrow('Host callback refused update');
  });
});
