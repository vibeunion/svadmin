import { flushSync, tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeleteManyPartialError, setAdminOptions } from '@svadmin/core';
import { createListDeletion } from './list-deletion.svelte.js';
import { createListSelection } from './list-selection.svelte.js';

vi.mock('svelte', async importOriginal => {
  const svelte = await importOriginal<typeof import('svelte')>();
  return { ...svelte, tick: vi.fn(svelte.tick) };
});

const disposers: Array<() => void> = [];

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function setup() {
  let allowed = $state(true);
  let loading = $state(false);
  let canRequest = $state(true);
  let canConfirm = $state(true);
  let scope = $state(1);
  const reportError = vi.fn<(message: string | null) => void>();
  const mutate = vi.fn<(ids: (string | number)[]) => Promise<unknown>>().mockResolvedValue(undefined);
  let selection!: ReturnType<typeof createListSelection>;
  let model!: ReturnType<typeof createListDeletion>;
  const clearSelection = vi.fn(() => selection.clearExplicit());
  const dispose = $effect.root(() => {
    selection = createListSelection({
      filters: () => [], sorters: () => [], total: () => 2,
      selectable: () => true, allowAllMatching: () => false, onCriteriaChange: () => {},
    });
    model = createListDeletion({
      canRequestSingle: () => canRequest,
      canRequestBatch: () => canRequest,
      canConfirm: () => canConfirm && allowed,
      permission: () => ({ isLoading: loading, allowed }),
      selection: () => selection,
      clearSelection,
      captureScope: () => {
        const previous = scope;
        return () => previous === scope;
      },
      mutate, reportError,
      messages: {
        single: () => 'Delete?',
        batch: count => `Delete ${count}?`,
        failure: () => 'Failed',
        partial: (failed, total) => `${failed}/${total} failed`,
      },
    });
  });
  disposers.push(dispose);
  flushSync();
  return {
    model, selection, mutate, reportError, clearSelection, dispose,
    permission(nextAllowed: boolean, nextLoading = false) {
      allowed = nextAllowed; loading = nextLoading; flushSync();
    },
    gates(request: boolean, confirm: boolean) { canRequest = request; canConfirm = confirm; flushSync(); },
    changeScope() { scope += 1; flushSync(); },
  };
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  setAdminOptions({ mutationMode: 'pessimistic' });
  vi.mocked(tick).mockClear();
});

describe('list deletion model', () => {
  it('opens single confirmation and retains numeric identifiers', async () => {
    const { model, mutate, clearSelection } = setup();
    model.requestDelete(1);
    expect(model.request).toEqual({ ids: [1], batch: false });
    expect(model.message).toBe('Delete?');
    expect(model.open).toBe(true);
    await model.confirm();
    expect(mutate).toHaveBeenCalledWith([1]);
    expect(clearSelection).toHaveBeenCalledOnce();
    expect(model.request).toBeNull();
    expect(model.pending).toBe(false);
  });

  it('snapshots batch identifiers without converting string IDs', async () => {
    const { model, selection, mutate } = setup();
    selection.retainFailedIds([1, '1']);
    model.requestBatchDelete();
    expect(model.message).toBe('Delete 2?');
    expect(model.request).toEqual({ ids: [1, '1'], batch: true });
    await model.confirm();
    expect(mutate).toHaveBeenCalledWith([1, '1']);
  });

  it('does not open an empty batch or a request rejected by its gate', () => {
    const { model, gates, selection } = setup();
    model.requestBatchDelete();
    expect(model.open).toBe(false);
    gates(false, false);
    selection.retainFailedIds([1]);
    model.requestDelete(1);
    model.requestBatchDelete();
    expect(model.request).toBeNull();
  });

  it('rechecks the execution gate before mutating', async () => {
    const { model, gates, mutate } = setup();
    model.requestDelete(1);
    gates(true, false);
    await model.confirm();
    expect(mutate).not.toHaveBeenCalled();
    expect(model.open).toBe(true);
    model.cancel();
    expect(model.request).toBeNull();
  });

  it('rejects a confirmed batch whose selected IDs have changed', async () => {
    const { model, selection, mutate } = setup();
    selection.retainFailedIds([1, 2]);
    model.requestBatchDelete();
    selection.retainFailedIds([2]);
    await model.confirm();
    expect(mutate).not.toHaveBeenCalled();
    expect(model.open).toBe(false);
    expect(model.request).toBeNull();
  });

  it('waits for permission resolution and fails closed after denial', () => {
    const { model, permission, reportError } = setup();
    permission(false, true);
    model.requestDelete(1);
    flushSync();
    expect(model.open).toBe(true);
    permission(false);
    expect(model.request).toBeNull();
    expect(model.open).toBe(false);
    expect(reportError).toHaveBeenLastCalledWith('Failed');
  });

  it('ignores duplicate confirmations and cancellation while a mutation is pending', async () => {
    const pending = deferred();
    const { model, mutate } = setup();
    mutate.mockReturnValue(pending.promise);
    model.requestDelete(1);
    const result = model.confirm();
    await model.confirm();
    model.cancel();
    model.requestDelete(2);
    model.requestBatchDelete();
    expect(model.pending).toBe(true);
    expect(model.request?.ids).toEqual([1]);
    expect(mutate).toHaveBeenCalledOnce();
    pending.resolve();
    await result;
    expect(model.pending).toBe(false);
  });

  it('cancels only an unsubmitted batch when query criteria change', () => {
    const { model, selection } = setup();
    model.requestDelete(1);
    model.cancelBatchOnCriteriaChange();
    expect(model.open).toBe(true);
    selection.retainFailedIds([1]);
    model.requestBatchDelete();
    model.cancelBatchOnCriteriaChange();
    expect(model.request).toBeNull();
  });

  it('retains selected IDs after an ordinary failure', async () => {
    const { model, selection, mutate, reportError } = setup();
    selection.retainFailedIds([1, '2']);
    mutate.mockRejectedValue(new Error('network'));
    model.requestBatchDelete();
    await model.confirm();
    expect(selection.selectedIds).toEqual([1, '2']);
    expect(reportError).toHaveBeenLastCalledWith('Failed');
    expect(model.pending).toBe(false);
  });

  it.each(['pessimistic', 'undoable'] as const)('keeps only failed IDs after partial failure in %s mode', async mode => {
    setAdminOptions({ mutationMode: mode });
    const { model, selection, mutate, reportError } = setup();
    selection.retainFailedIds([1, '2']);
    mutate.mockRejectedValue(new DeleteManyPartialError([1], ['2']));
    model.requestBatchDelete();
    await model.confirm();
    expect(selection.selectedIds).toEqual(['2']);
    expect(reportError).toHaveBeenLastCalledWith('1/2 failed');
  });

  it('restores the pre-mutation selection after an undoable-mode failure', async () => {
    setAdminOptions({ mutationMode: 'undoable' });
    const pending = deferred();
    const { model, selection, mutate } = setup();
    selection.retainFailedIds([1, '2']);
    mutate.mockReturnValue(pending.promise);
    model.requestBatchDelete();
    const result = model.confirm();
    expect(selection.selectedIds).toEqual([]);
    pending.reject(new Error('network'));
    await result;
    expect(selection.selectedIds).toEqual([1, '2']);
  });

  it.each(['resolve', 'reject'] as const)('ignores stale %s results after scope changes', async outcome => {
    const pending = deferred();
    const { model, selection, mutate, changeScope, clearSelection, reportError } = setup();
    mutate.mockReturnValue(pending.promise);
    model.requestDelete(1);
    const result = model.confirm();
    changeScope();
    selection.retainFailedIds([2]);
    reportError.mockClear();
    if (outcome === 'resolve') pending.resolve();
    else pending.reject(new DeleteManyPartialError([], [1]));
    await result;
    expect(selection.selectedIds).toEqual([2]);
    expect(clearSelection).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
  });

  it('does not let an old completion clear a newer request after reset', async () => {
    const first = deferred();
    const second = deferred();
    const { model, mutate, clearSelection } = setup();
    mutate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    model.requestDelete(1);
    const firstResult = model.confirm();
    model.reset();
    model.requestDelete(2);
    const secondResult = model.confirm();
    first.resolve();
    await firstResult;
    expect(model.pending).toBe(true);
    expect(model.request?.ids).toEqual([2]);
    expect(clearSelection).not.toHaveBeenCalled();
    second.resolve();
    await secondResult;
    expect(model.pending).toBe(false);
    expect(clearSelection).toHaveBeenCalledOnce();
  });

  it('does not close a new confirmation when an old success resumes after tick', async () => {
    const boundary = deferred();
    const { model, mutate } = setup();
    vi.mocked(tick).mockImplementationOnce(() => boundary.promise);
    model.requestDelete(1);
    const firstResult = model.confirm();
    await Promise.resolve();
    expect(tick).toHaveBeenCalledOnce();
    model.reset();
    model.requestDelete(2);
    boundary.resolve();
    await firstResult;
    expect(model.open).toBe(true);
    expect(model.pending).toBe(false);
    expect(model.request?.ids).toEqual([2]);
    expect(mutate).toHaveBeenCalledOnce();
  });

  it.each(['resolve', 'reject'] as const)('ignores late %s after destruction', async outcome => {
    const pending = deferred();
    const { model, mutate, dispose, clearSelection, reportError } = setup();
    mutate.mockReturnValue(pending.promise);
    model.requestDelete(1);
    const result = model.confirm();
    dispose();
    reportError.mockClear();
    if (outcome === 'resolve') pending.resolve();
    else pending.reject(new Error('late failure'));
    await result;
    expect(clearSelection).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
  });
});
