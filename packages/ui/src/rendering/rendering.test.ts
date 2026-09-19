import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { Type } from '@sinclair/typebox';
import { defineResource } from '@svadmin/core/resource-contract';
import { createResourceRenderers } from './index.js';
import { orders } from '../../../../scripts/fixtures/ui-rendering/resource.js';
import RenderingFixture from '../../../../scripts/fixtures/ui-rendering/RenderingFixture.svelte';

const ui = createResourceRenderers(orders);
const record = { id: 1, status: 'paid', amount: 4 };
const field = { key: 'status', label: 'Status', type: 'select' as const };

// 反例从未知 JS 调用进入；不使用类型断言伪装成安全调用。
function invoke(method: (...args: never[]) => unknown, ...args: unknown[]): unknown {
  return Reflect.apply(method, undefined, args);
}

describe('contract-backed native Svelte renderers', () => {
  it('reads cells from checked records, not the supplied detached value', () => {
    expect(ui.cell('amount', { record, value: 'spoofed' }).value).toBe(4);
  });
  it('returns detached record snapshots', () => {
    const checked = ui.record(record);
    checked.amount = 99;
    expect(record.amount).toBe(4);
  });
  it('preserves optional fields without manufacturing a value', () => {
    expect(ui.cell('note', { record, value: '' }).value).toBeUndefined();
  });
  it.each([
    { ...record, amount: '4' }, { ...record, status: 'cancelled' },
    { ...record, extra: true }, { ...record, amount: Number.NaN },
  ])('rejects invalid record %j', (candidate) => {
    expect(() => ui.record(candidate)).toThrow();
  });
  it('rejects getters without evaluating them', () => {
    const getter = vi.fn(() => 1);
    const candidate = Object.defineProperty({ ...record }, 'amount', { get: getter, enumerable: true });
    expect(() => ui.record(candidate)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
  it('rejects unknown fields at the JavaScript boundary', () => {
    expect(() => invoke(ui.cell, 'constructor', { record, value: 1 })).toThrow();
  });
  it('validates row identity and all summary records', () => {
    expect(ui.row({ record, id: 1 }).id).toBe(1);
    expect(() => ui.row({ record, id: 2 })).toThrow('identity mismatch');
    expect(() => ui.row({ record, id: '1' })).toThrow();
    expect(ui.summary({ data: [record], total: 1, visibleColumnsCount: 3 }).data[0]).toEqual(record);
    expect(() => ui.summary({ data: [{ ...record, amount: 'x' }], total: 1, visibleColumnsCount: 3 })).toThrow();
    expect(() => ui.summary({ data: [], total: -1, visibleColumnsCount: 3 })).toThrow();
  });
  it('checks a field independently of other missing required fields', () => {
    const checked = ui.field('create', 'status', { field, value: 'paid', onchange: vi.fn() });
    expect(checked.state).toEqual({ valid: true, value: 'paid' });
  });
  it('keeps invalid and required-missing draft values untyped', () => {
    expect(ui.field('create', 'status', { field, value: 'cancelled', onchange: vi.fn() }).state).toEqual({ valid: false });
    expect(ui.field('create', 'status', { field, value: undefined, onchange: vi.fn() }).state).toEqual({ valid: false });
  });
  it('uses update optionality and clone/create requirements', () => {
    expect(ui.field('edit', 'status', { field, value: undefined, onchange: vi.fn() }).state).toEqual({ valid: true, value: undefined });
    expect(ui.field('clone', 'status', { field, value: undefined, onchange: vi.fn() }).state).toEqual({ valid: false });
  });
  it('validates typed writes again at runtime, without emitting invalid values', () => {
    const onchange = vi.fn();
    const checked = ui.field('create', 'status', { field, value: 'paid', onchange });
    checked.onchange('pending');
    expect(onchange).toHaveBeenLastCalledWith('pending');
    expect(() => invoke(checked.onchange, 'cancelled')).toThrow('Invalid renderer field value');
    expect(onchange).toHaveBeenCalledTimes(1);
  });
  it('allows plain incomplete drafts but rejects unsafe draft values', () => {
    const onchange = vi.fn();
    const checked = ui.field('create', 'status', { field, value: 'paid', onchange });
    checked.onDraftChange('pend');
    expect(onchange).toHaveBeenLastCalledWith('pend');
    expect(() => checked.onDraftChange(() => 'pending')).toThrow();
    expect(() => checked.onDraftChange(new Date())).toThrow();
    expect(onchange).toHaveBeenCalledTimes(1);
  });
  it('does not permit either write path in show mode', () => {
    const onchange = vi.fn();
    const checked = ui.field('show', 'status', { field, value: 'paid', onchange });
    expect(checked.readonly).toBe(true);
    expect(() => checked.onchange('pending')).toThrow('read-only');
    expect(() => checked.onDraftChange('pending')).toThrow('read-only');
    expect(onchange).not.toHaveBeenCalled();
  });
  it('rejects a mismatched field, unavailable operation field, and invalid action', () => {
    const input = { field, value: 1, onchange: vi.fn() };
    expect(() => ui.field('create', 'amount', input)).toThrow('mismatch');
    expect(() => invoke(ui.field, 'edit', 'amount', { ...input, field: { ...field, key: 'amount' } })).toThrow();
    expect(() => invoke(ui.field, 'bogus', 'status', input)).toThrow('action');
  });
  it('uses the private schema snapshot rather than a mutated original schema', () => {
    const amount = Type.Number();
    const resource = defineResource('snapshot', { record: Type.Object({ id: Type.Number(), amount }), create: Type.Object({ amount }) });
    amount.minimum = 10;
    const checked = createResourceRenderers(resource).field('create', 'amount', {
      field: { key: 'amount', label: 'Amount', type: 'number' }, value: 1, onchange: vi.fn(),
    });
    expect(checked.state).toEqual({ valid: true, value: 1 });
  });
  it('checks column-map keys and refuses accessor-based maps without invoking them', () => {
    expect(ui.columns({})).toEqual({});
    expect(() => invoke(ui.columns, { typo: () => {} })).toThrow();
    const getter = vi.fn();
    expect(() => invoke(ui.columns, Object.defineProperty({}, 'status', { get: getter, enumerable: true }))).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
  it('renders native snippets and TS component descriptors and updates them reactively', async () => {
    const onchange = vi.fn();
    const view = render(RenderingFixture, { status: 'paid', onchange });
    expect(screen.getByTestId('cell-status').textContent).toBe('paid');
    expect(screen.getByTestId('field-status').textContent).toBe('paid');
    expect(screen.getByTestId('component-status').textContent).toBe('paid');
    await fireEvent.click(screen.getByRole('button', { name: 'Change status' }));
    expect(onchange).toHaveBeenCalledWith('pending');
    await view.rerender({ status: 'pending', onchange });
    expect(screen.getByTestId('cell-status').textContent).toBe('pending');
    expect(screen.getByTestId('field-status').textContent).toBe('pending');
    expect(screen.getByTestId('component-status').textContent).toBe('pending');
  });
});
