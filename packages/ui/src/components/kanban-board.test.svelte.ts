import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import KanbanBoard, { type KanbanCard } from './KanbanBoard.svelte';
import KanbanBoardHost from './kanban-board.test-host.svelte';
import LiteKanbanBoard from '../../../lite/src/components/LiteKanbanBoard.svelte';

import { requireValue } from '../../../../scripts/test-assertions';
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
afterEach(() => { cleanup(); });

describe('Kanban mutation lifecycle', () => {
  it('previews a move, serializes writes and commits after confirmation', async () => {
    const pending = deferred<undefined>();
    const oncardmove = vi.fn(() => pending.promise);
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'Alpha' })).toBeTruthy();
    expect(initial[0]?.columnId).toBe('todo');
    expect(view.getByRole('region', { name: 'Kanban board' }).getAttribute('aria-busy')).toBe('true');
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Beta' }), { target: { value: 'done' } });
    expect(oncardmove).toHaveBeenCalledTimes(1);
    expect(oncardmove).toHaveBeenCalledWith('a', 'done', 1);
    pending.resolve(undefined);
    await tick();
    expect(view.getByRole('region', { name: 'Kanban board' }).getAttribute('aria-busy')).toBe('false');
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'Alpha' })).toBeTruthy();
  });

  it('marks only the pending card busy and clears it after the move receipt', async () => {
    const pending = deferred<undefined>();
    const oncardmove = vi.fn(() => pending.promise);
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'Alpha' }).getAttribute('aria-busy')).toBe('true');
    expect(view.getByRole('group', { name: 'Beta' }).getAttribute('aria-busy')).toBe('false');
    expect(view.getByRole('group', { name: 'Gamma' }).getAttribute('aria-busy')).toBe('false');
    expect(view.getByRole('region', { name: 'Kanban board' }).getAttribute('aria-busy')).toBe('true');
    pending.resolve(undefined);
    await tick();
    expect(view.getByRole('group', { name: 'Alpha' }).getAttribute('aria-busy')).toBe('false');
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'Alpha' })).toBeTruthy();
  });

  it('commits only the awaited authoritative move receipt', async () => {
    const pending = deferred<KanbanCard | void>();
    const oncardmove = vi.fn(() => pending.promise);
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'Alpha' })).toBeTruthy();
    expect(initial[0]?.columnId).toBe('todo');
    pending.resolve({ id: 'a', title: 'Server title', columnId: 'done' });
    await tick();
    expect(view.queryByRole('group', { name: 'Alpha' })).toBeNull();
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'Server title' })).toBeTruthy();
    expect(initial[0]?.columnId).toBe('todo');
    expect(view.getByRole('region', { name: 'Kanban board' }).getAttribute('aria-busy')).toBe('false');
  });

  it('rolls back a rejection, sanitizes the error and retries the same move', async () => {
    const rejection = deferred<void>();
    const oncardmove = vi.fn().mockImplementationOnce(() => rejection.promise).mockResolvedValueOnce(undefined);
    const oncardmoveerror = vi.fn();
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove, oncardmoveerror });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    rejection.reject(new Error('private server response'));
    await tick();
    expect(within(view.getByRole('region', { name: 'To do' })).getByRole('group', { name: 'Alpha' })).toBeTruthy();
    expect(view.getByRole('alert').textContent).toContain('Local preview reverted');
    expect(view.container.textContent).not.toContain('private server response');
    expect(oncardmoveerror).toHaveBeenCalledTimes(1);
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    expect(oncardmove).toHaveBeenCalledTimes(2);
    expect(oncardmove).toHaveBeenLastCalledWith('a', 'done', 1);
    await tick();
    expect(view.queryByRole('alert')).toBeNull();
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'Alpha' })).toBeTruthy();
  });

  it.each([
    { label: 'wrong id', receipt: { id: 'other', title: 'Server', columnId: 'done' } },
    { label: 'wrong target column', receipt: { id: 'a', title: 'Server', columnId: 'todo' } },
    { label: 'invalid structure', receipt: { id: 'a', title: '', columnId: 'done' } },
    { label: 'null receipt', receipt: null },
  ])('rolls back a $label and allows an explicit retry', async ({ receipt }) => {
    const oncardmove = vi.fn()
      .mockResolvedValueOnce(receipt as KanbanCard)
      .mockResolvedValueOnce({ id: 'a', title: 'Retried', columnId: 'done' });
    const oncardmoveerror = vi.fn();
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove, oncardmoveerror });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    await tick();
    expect(within(view.getByRole('region', { name: 'To do' })).getByRole('group', { name: 'Alpha' })).toBeTruthy();
    expect(view.queryByRole('group', { name: 'Server' })).toBeNull();
    expect(view.getByRole('alert').textContent).toContain('Local preview reverted');
    expect(view.container.textContent).not.toContain('Invalid move receipt');
    expect(oncardmoveerror).toHaveBeenCalledTimes(1);
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    expect(oncardmove).toHaveBeenCalledTimes(2);
    expect(oncardmove).toHaveBeenLastCalledWith('a', 'done', 1);
    await tick();
    expect(view.queryByRole('alert')).toBeNull();
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'Retried' })).toBeTruthy();
  });

  it('snapshots the authoritative receipt so later mutation cannot alter committed cards', async () => {
    const receipt: KanbanCard = { id: 'a', title: 'Server title', columnId: 'done', tags: ['server'] };
    const delivered: KanbanCard[][] = [];
    const oncardmove = vi.fn(async () => receipt);
    const view = render(KanbanBoardHost, {
      columns,
      initialCards: initial,
      oncardmove,
      onCardsChange: (cards: KanbanCard[]) => delivered.push(cards),
    });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    await tick();
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'Server title' })).toBeTruthy();
    const committed = requireValue(delivered.at(-1)).find(card => card.id === 'a');
    expect(committed).not.toBe(receipt);
    expect(requireValue(committed?.tags)).not.toBe(receipt.tags);
    receipt.title = 'Mutated title';
    receipt.columnId = 'todo';
    requireValue(receipt.tags).push('mutated');
    await tick();
    expect(committed?.title).toBe('Server title');
    expect(committed?.columnId).toBe('done');
    expect(committed?.tags).toEqual(['server']);
    expect(view.queryByRole('group', { name: 'Mutated title' })).toBeNull();
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'Server title' })).toBeTruthy();
  });

  it.each(['success', 'failure'] as const)('ignores a late %s after unmount without callback or delivery', async settlement => {
    const pending = deferred<KanbanCard | void>();
    const delivered: KanbanCard[][] = [];
    const oncardmove = vi.fn(() => pending.promise);
    const oncardmoveerror = vi.fn();
    const view = render(KanbanBoardHost, {
      columns,
      initialCards: initial,
      oncardmove,
      oncardmoveerror,
      onCardsChange: (cards: KanbanCard[]) => delivered.push(cards.map(card => ({ ...card }))),
    });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    view.unmount();
    if (settlement === 'success') pending.resolve({ id: 'a', title: 'Late server', columnId: 'done' });
    else pending.reject(new Error('late failure'));
    await tick();
    await Promise.resolve();
    expect(oncardmoveerror).not.toHaveBeenCalled();
    expect(delivered.some(cards => cards.some(card => card.title === 'Late server'))).toBe(false);
  });

  it('serializes retry submissions and clears failed retry state on scope switch', async () => {
    const rejection = deferred<void>();
    const retry = deferred<void>();
    const oncardmove = vi.fn().mockImplementationOnce(() => rejection.promise).mockImplementationOnce(() => retry.promise);
    const oncardmoveerror = vi.fn();
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove, oncardmoveerror, scopeKey: 'tenant-a' });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    rejection.reject(new Error('first failure'));
    await tick();
    const retryButton = view.getByRole('button', { name: 'Retry' });
    retryButton.click();
    retryButton.click();
    expect(oncardmove).toHaveBeenCalledTimes(2);
    await view.rerender({ scopeKey: 'tenant-b', cards: [{ id: 'new', title: 'New', columnId: 'todo' }] });
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.queryByRole('button', { name: 'Retry' })).toBeNull();
    retry.reject(new Error('late failure'));
    await tick();
    expect(view.queryByRole('alert')).toBeNull();
    expect(oncardmoveerror).toHaveBeenCalledTimes(1);
  });

  it('rolls back a rejected preview without hiding the board or raw-error disclosure', async () => {
    const pending = deferred<undefined>();
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
    const old = deferred<undefined>();
    const newer = deferred<undefined>();
    const oncardmove = vi.fn().mockImplementationOnce(() => old.promise).mockImplementationOnce(() => newer.promise);
    const oncardmoveerror = vi.fn();
    const view = render(KanbanBoard, { columns, cards: initial, oncardmove, oncardmoveerror, scopeKey: 'tenant-a' });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move Alpha' }), { target: { value: 'done' } });
    await view.rerender({ scopeKey: 'tenant-b', cards: [{ id: 'new', title: 'New', columnId: 'todo' }] });
    await fireEvent.change(view.getByRole('combobox', { name: 'Move New' }), { target: { value: 'done' } });
    if (settlement === 'success') old.resolve(undefined); else old.reject(new Error('old failure'));
    await tick();
    expect(view.queryByRole('group', { name: 'Alpha' })).toBeNull();
    expect(view.queryByRole('alert')).toBeNull();
    expect(oncardmoveerror).not.toHaveBeenCalled();
    expect(view.getByRole('region', { name: 'Kanban board' }).getAttribute('aria-busy')).toBe('true');
    newer.resolve(undefined);
    await tick();
    expect(within(view.getByRole('region', { name: 'Done' })).getByRole('group', { name: 'New' })).toBeTruthy();
  });

  it('preserves an authoritative external refresh when a move fails', async () => {
    const pending = deferred<undefined>();
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
    expect(view.getByRole('group', { name: 'Alpha' }).getAttribute('draggable')).toBe('false');
    await fireEvent.dragStart(view.getByRole('group', { name: 'Alpha' }));
    await fireEvent.drop(view.getByRole('region', { name: 'Done' }));
    expect(oncardmove).not.toHaveBeenCalled();
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
    await fireEvent.click(view.getByRole('button', { name: 'Add' }));
    expect(view.queryByRole('group', { name: 'New task' })).toBeNull();
    expect(oncardadd).toHaveBeenCalledWith('todo', 'New task');
    pending.resolve({ id: 'server-123', title: 'New task', columnId: 'todo' });
    await tick();
    expect(view.getByRole('group', { name: 'New task' })).toBeTruthy();
  });

  it('does not submit duplicate card creation while the first Add is pending', async () => {
    const pending = deferred<KanbanCard>();
    const oncardadd = vi.fn(() => pending.promise);
    const view = render(KanbanBoard, { columns, cards: initial, oncardadd });
    await fireEvent.click(view.getByRole('button', { name: 'Add card to To do' }));
    await fireEvent.input(view.getByRole('textbox', { name: 'Card title' }), { target: { value: 'One pending card' } });
    const addButton = view.getByRole('button', { name: 'Add' });
    await fireEvent.click(addButton);
    await fireEvent.click(addButton);
    expect(oncardadd).toHaveBeenCalledTimes(1);
    expect((addButton as HTMLButtonElement).disabled).toBe(true);
    pending.resolve({ id: 'server-one', title: 'One pending card', columnId: 'todo' });
    await tick();
    expect(view.getByRole('group', { name: 'One pending card' })).toBeTruthy();
  });

  it.each(['success', 'failure'] as const)('ignores an old card-add %s after switching scope', async settlement => {
    const old = deferred<KanbanCard>();
    const oncardadd = vi.fn(() => old.promise);
    const view = render(KanbanBoard, {
      columns,
      cards: initial,
      oncardadd,
      scopeKey: 'tenant-a',
    });
    await fireEvent.click(view.getByRole('button', { name: 'Add card to To do' }));
    await fireEvent.input(view.getByRole('textbox', { name: 'Card title' }), { target: { value: 'Old scope card' } });
    await fireEvent.click(view.getByRole('button', { name: 'Add' }));
    await view.rerender({ scopeKey: 'tenant-b', cards: [{ id: 'new', title: 'New scope', columnId: 'todo' }] });
    if (settlement === 'success') old.resolve({ id: 'old-server', title: 'Old scope card', columnId: 'todo' });
    else old.reject(new Error('old scope failed'));
    await tick();
    expect(view.queryByRole('group', { name: 'Old scope card' })).toBeNull();
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('group', { name: 'New scope' })).toBeTruthy();
  });

  it('keeps the committed card snapshot when the add receipt is mutated later', async () => {
    const receipt: KanbanCard = { id: 'server-snapshot', title: 'Snapshot card', columnId: 'todo', tags: ['submitted'] };
    const oncardadd = vi.fn(async () => receipt);
    const view = render(KanbanBoard, { columns, cards: initial, oncardadd });
    await fireEvent.click(view.getByRole('button', { name: 'Add card to To do' }));
    await fireEvent.input(view.getByRole('textbox', { name: 'Card title' }), { target: { value: 'Snapshot card' } });
    await fireEvent.click(view.getByRole('button', { name: 'Add' }));
    await tick();
    expect(view.getByRole('group', { name: 'Snapshot card' })).toBeTruthy();
    receipt.title = 'Mutated card';
    receipt.columnId = 'done';
    requireValue(receipt.tags).push('mutated');
    await tick();
    expect(view.queryByRole('group', { name: 'Mutated card' })).toBeNull();
    expect(view.getByRole('group', { name: 'Snapshot card' })).toBeTruthy();
  });

  it('rejects duplicate creation receipts and retains the editable draft', async () => {
    const view = render(KanbanBoard, { columns, cards: initial, oncardadd: async () =>requireValue( initial[0]) });
    await fireEvent.click(view.getByRole('button', { name: 'Add card to To do' }));
    await fireEvent.input(view.getByRole('textbox', { name: 'Card title' }), { target: { value: 'Draft' } });
    await fireEvent.click(view.getByRole('button', { name: 'Add' }));
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
    { cards: [requireValue(initial[0]),requireValue( initial[0])] },
    { cards: [{ ...requireValue(initial[0]), columnId: 'missing' }] },
    { cards: [{ ...requireValue(initial[0]), title: '' }] },
    { columns: [requireValue(columns[0]),requireValue( columns[0])] },
    { cards: Array.from({ length: 1001 }, (_, i) => ({ ...requireValue(initial[0]), id: String(i) })) },
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
    const view = render(LiteKanbanBoard, { columns, cards: [requireValue(initial[0]),requireValue( initial[0])], formAction: '/create' });
    expect(view.getByRole('alert')).toBeTruthy();
    expect(view.queryByRole('group')).toBeNull();
    await view.rerender({ cards: initial, error: 'Failed', retryHref: '/board' });
    expect(view.getByRole('link', { name: 'Retry' }).getAttribute('href')).toBe('/board');
    await view.rerender({ error: undefined, formAction: 'javascript:alert(1)' });
    expect(view.queryByRole('form')).toBeNull();
  });

  it('uses localized state labels', () => {
    const view = render(LiteKanbanBoard, { columns, cards: [], formAction: '/create' }, 'zh-CN');
    expect(view.getByRole('region', { name: '看板' })).toBeTruthy();
    expect(view.getAllByRole('status')[0]?.textContent).toContain('暂无数据');
    expect(view.getByRole('form', { name: '向 To do 新增卡片' })).toBeTruthy();
  });
});
