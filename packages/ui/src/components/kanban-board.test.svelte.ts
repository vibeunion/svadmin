import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { setLocale } from '@svadmin/core/i18n';
import KanbanBoard, { type KanbanCard } from './KanbanBoard.svelte';
import LiteKanbanBoard from '../../../lite/src/components/LiteKanbanBoard.svelte';

const columns = [{ id: 'todo', title: 'To do' }, { id: 'done', title: 'Done' }];
const initial: KanbanCard[] = [
  { id: 'a', title: 'Alpha', columnId: 'todo' },
  { id: 'b', title: 'Beta', columnId: 'todo' },
  { id: 'c', title: 'Gamma', columnId: 'done' },
];
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => setLocale('en'));
afterEach(() => { cleanup(); setLocale('en'); });

describe('Kanban mutation lifecycle', () => {
  it('previews a move, serializes writes and commits after confirmation', async () => {
    const pending = deferred<void>();
    const oncardmove = vi.fn(() => pending.promise);
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'Alpha' })).toBeTruthy();
    expect(initial[0]?.columnId).toBe('todo');
    expect(view.getByRole('region', { name: 'Kanban board' }).getAttribute('aria-busy')).toBe('true');
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Beta' }), { target: { value: 'done' } });
    expect(oncardmove).toHaveBeenCalledTimes(1);
    expect(oncardmove).toHaveBeenCalledWith('a', 'done', 1);
    pending.resolve();
    await tick();
    expect(view.getByRole('region', { name: 'Kanban board' }).getAttribute('aria-busy')).toBe('false');
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'Alpha' })).toBeTruthy();
  });

  it('rolls back a rejected preview without hiding the board or raw-error disclosure', async () => {
    const pending = deferred<void>();
    const observer = vi.fn(() => { throw new Error('observer failed'); });
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove: () => pending.promise, oncardmoveerror: observer });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    pending.reject(new Error('private server response'));
    await tick();
    expect(within(view.getByRole('region', { name: 'To do' })).getByRole('group', { name: 'Alpha' })).toBeTruthy();
    expect(view.getByRole('alert').textContent).toContain('Local preview reverted');
    expect(view.container.textContent).not.toContain('private server response');
    expect(observer).toHaveBeenCalledTimes(1);
  });

  it.each(['success', 'failure'] as const)('ignores old %s after scope switch and a newer move', async settlement => {
    const old = deferred<void>();
    const newer = deferred<void>();
    const oncardmove = vi.fn().mockImplementationOnce(() => old.promise).mockImplementationOnce(() => newer.promise);
    const oncardmoveerror = vi.fn();
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove, oncardmoveerror, scopeKey: 'tenant-a' });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    await view.rerender({ scopeKey: 'tenant-b', cards: [{ id: 'new', title: 'New', columnId: 'todo' }] });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move New' }), { target: { value: 'done' } });
    if (settlement === 'success') old.resolve(); else old.reject(new Error('old failure'));
    await tick();
    expect(view.queryByRole('group', { name: 'Alpha' })).toBeNull();
    expect(view.queryByRole('alert')).toBeNull();
    expect(oncardmoveerror).not.toHaveBeenCalled();
    expect(view.getByRole('region', { name: 'Kanban board' }).getAttribute('aria-busy')).toBe('true');
    newer.resolve();
    await tick();
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'New' })).toBeTruthy();
  });

  it('preserves an authoritative external refresh when a move fails', async () => {
    const pending = deferred<void>();
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove: () => pending.promise });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    await view.rerender({ cards: [{ id: 'a', title: 'Server changed title', columnId: 'done' }] });
    pending.reject(new Error('conflict'));
    await tick();
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('group', { name: 'Server changed title' })).toBeTruthy();
  });

  it.each(['denied', 'throws'] as const)('does not dispatch or preview when permission %s', async mode => {
    const oncardmove = vi.fn();
    const canMoveCard = () => { if (mode === 'throws') throw new Error('permission failed'); return false; };
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove, canMoveCard });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    expect(oncardmove).not.toHaveBeenCalled();
    expect(within(view.getByRole('region', { name: 'To do' })).getByRole('group', { name: 'Alpha' })).toBeTruthy();
  });

  it('provides keyboard-operable column moves and same-column ordering', async () => {
    const oncardmove = vi.fn(async () => {});
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove });
    await fireEvent.click(within(view.getByRole('group', { name: 'Beta' })).getByRole('button', { name: /Move up/i }));
    expect(oncardmove).toHaveBeenCalledWith('b', 'todo', 0);
    expect(within(view.getByRole('region', { name: 'To do' })).getAllByRole('group').map(node => node.getAttribute('aria-label'))).toEqual(['Beta', 'Alpha']);
  });

  it('supports drag/drop using the same persistence path', async () => {
    const oncardmove = vi.fn(async () => {});
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove });
    await fireEvent.dragStart(view.getByRole('group', { name: 'Alpha' }));
    await fireEvent.drop(view.getByRole('region', { name: 'Done' }));
    expect(oncardmove).toHaveBeenCalledWith('a', 'done', 1);
  });

  it('does not fabricate cards and waits for a valid server identity', async () => {
    const pending = deferred<KanbanCard>();
    const oncardadd = vi.fn(() => pending.promise);
    const view = render(KanbanBoard, { columns, cards: initial, oncardadd });
    await fireEvent.click(view.getByRole('button', { name: 'Add card to To do' }));
    await fireEvent.input(view.getByRole('textbox', { name: 'Card title' }), { target: { value: 'New task' } });
    await fireEvent.click(view.getByRole('button', { name: /^Add$/ }));
    expect(view.queryByRole('group', { name: 'New task' })).toBeNull();
    expect(oncardadd).toHaveBeenCalledWith('todo', 'New task');
    pending.resolve({ id: 'server-123', title: 'New task', columnId: 'todo' });
    await tick();
    expect(view.getByRole('group', { name: 'New task' })).toBeTruthy();
  });

  it('rejects duplicate creation receipts and retains the editable draft', async () => {
    const view = render(KanbanBoard, { columns, cards: initial, oncardadd: async () => initial[0]! });
    await fireEvent.click(view.getByRole('button', { name: 'Add card to To do' }));
    await fireEvent.input(view.getByRole('textbox', { name: 'Card title' }), { target: { value: 'Draft' } });
    await fireEvent.click(view.getByRole('button', { name: /^Add$/ }));
    expect(view.getByRole('alert').textContent).toContain('Creation not confirmed');
    expect((view.getByRole('textbox', { name: 'Card title' }) as HTMLTextAreaElement).value).toBe('Draft');
    expect(view.getAllByRole('group', { name: 'Alpha' })).toHaveLength(1);
  });

  it('ignores IME Enter during card-title composition', async () => {
    const oncardadd = vi.fn(async () => ({ id: 'new', title: 'New', columnId: 'todo' }));
    const view = render(KanbanBoard, { columns, cards: initial, oncardadd });
    await fireEvent.click(view.getByRole('button', { name: 'Add card to To do' }));
    const input = view.getByRole('textbox', { name: 'Card title' });
    await fireEvent.input(input, { target: { value: 'New' } });
    await fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(oncardadd).not.toHaveBeenCalled();
  });
});

describe('Kanban state boundaries', () => {
  it('is read-only without persistence callbacks', () => {
    const view = render(KanbanBoard, { columns, cards: initial });
    expect(view.queryByRole('button')).toBeNull();
    expect(view.queryByRole('combobox')).toBeNull();
    expect(view.getByRole('group', { name: 'Alpha' }).getAttribute('draggable')).toBe('false');
  });

  it('shows loading, external errors, retry and empty state', async () => {
    const onRetry = vi.fn();
    const view = render(KanbanBoard, { columns, cards: initial, loading: true, onRetry });
    expect(view.getByRole('status').textContent).toContain('Loading');
    expect(view.queryByRole('group')).toBeNull();
    await view.rerender({ loading: false, error: 'Failed' });
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await view.rerender({ error: undefined, columns: [], cards: [] });
    expect(view.getByRole('status').textContent).toContain('No data');
  });

  it.each([
    { cards: [initial[0]!, initial[0]!] },
    { cards: [{ ...initial[0]!, columnId: 'missing' }] },
    { cards: [{ ...initial[0]!, title: '' }] },
    { columns: [columns[0]!, columns[0]!] },
    { cards: Array.from({ length: 1001 }, (_, i) => ({ ...initial[0]!, id: String(i) })) },
  ])('rejects invalid inputs without a partial board', patch => {
    const view = render(KanbanBoard, { columns, cards: initial, ...patch });
    expect(view.getByRole('alert')).toBeTruthy();
    expect(view.queryByRole('group')).toBeNull();
  });
});

describe('Lite Kanban native boundaries', () => {
  it('renders an accessible native creation form but no move controls', () => {
    const view = render(LiteKanbanBoard, { columns, cards: initial, formAction: '?/add' });
    const form = view.getByRole('form', { name: 'Add card to To do' });
    expect(form.getAttribute('method')).toBe('POST');
    expect(form.getAttribute('action')).toBe('?/add');
    expect(form.querySelector<HTMLInputElement>('input[name=columnId]')?.value).toBe('todo');
    expect(form.querySelector<HTMLInputElement>('input[name=title]')?.required).toBe(true);
    expect(view.queryByRole('combobox')).toBeNull();
  });

  it('rejects invalid data, supports error recovery and suppresses unsafe actions', async () => {
    const view = render(LiteKanbanBoard, { columns, cards: [initial[0]!, initial[0]!], formAction: '/create' });
    expect(view.getByRole('alert')).toBeTruthy();
    expect(view.queryByRole('group')).toBeNull();
    await view.rerender({ cards: initial, error: 'Failed', retryHref: '/board' });
    expect(view.getByRole('link', { name: 'Retry' }).getAttribute('href')).toBe('/board');
    await view.rerender({ error: undefined, formAction: 'javascript:alert(1)' });
    expect(view.queryByRole('form')).toBeNull();
  });

  it('uses localized state labels', () => {
    setLocale('zh-CN');
    const view = render(LiteKanbanBoard, { columns, cards: [], formAction: '/create' });
    expect(view.getByRole('region', { name: '看板' })).toBeTruthy();
    expect(view.getAllByRole('status')[0]?.textContent).toContain('暂无数据');
    expect(view.getByRole('form', { name: '向 To do 新增卡片' })).toBeTruthy();
  });
});
