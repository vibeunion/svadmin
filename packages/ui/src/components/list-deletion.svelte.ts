import { tick } from 'svelte';
import { DeleteManyPartialError, getAdminOptions } from '@svadmin/core';
import type { createListSelection } from './list-selection.svelte.js';

interface DeleteRequest {
  ids: (string | number)[];
  batch: boolean;
}

interface ListDeletionOptions {
  canRequestSingle: () => boolean;
  canRequestBatch: () => boolean;
  canConfirm: () => boolean;
  permission: () => { isLoading: boolean; allowed: boolean };
  selection: () => Pick<ReturnType<typeof createListSelection>,
    'selectedIds' | 'captureExplicit' | 'restoreExplicit' | 'retainFailedIds'>;
  clearSelection: () => void;
  captureScope: () => () => boolean;
  mutate: (ids: (string | number)[]) => Promise<unknown>;
  reportError: (message: string | null) => void;
  messages: {
    single: () => string;
    batch: (count: number) => string;
    failure: () => string;
    partial: (failed: number, total: number) => string;
  };
}

export function createListDeletion(options: ListDeletionOptions) {
  let request = $state<DeleteRequest | null>(null);
  let open = $state(false);
  let message = $state('');
  let pending = $state(false);
  let activeDelete: object | undefined;

  $effect(() => {
    if (request && !options.permission().isLoading && !options.permission().allowed) {
      open = false;
      request = null;
      options.reportError(options.messages.failure());
    }
  });
  $effect(() => () => { activeDelete = undefined; });

  function requestDelete(id: string | number): void {
    if (!options.canRequestSingle() || pending) return;
    message = options.messages.single();
    request = { ids: [id], batch: false };
    options.reportError(null);
    open = true;
  }

  function requestBatchDelete(): void {
    const ids = [...options.selection().selectedIds];
    if (!options.canRequestBatch() || ids.length === 0 || pending) return;
    message = options.messages.batch(ids.length);
    request = { ids, batch: true };
    options.reportError(null);
    open = true;
  }

  function cancel(): void {
    if (pending) return;
    open = false;
    request = null;
  }

  function cancelBatchOnCriteriaChange(): void {
    if (request?.batch && !pending) cancel();
  }

  function reset(): void {
    activeDelete = undefined;
    open = false;
    pending = false;
    request = null;
    options.reportError(null);
  }

  async function confirm(): Promise<void> {
    if (!open || !options.canConfirm() || pending || !request) return;
    const confirmedRequest = request;
    const selection = options.selection();
    if (confirmedRequest.batch && JSON.stringify(confirmedRequest.ids) !== JSON.stringify(selection.selectedIds)) {
      cancel();
      return;
    }
    const scopeIsCurrent = options.captureScope();
    const token = {};
    activeDelete = token;
    pending = true;
    open = false;
    const clearBeforeMutation = confirmedRequest.batch && getAdminOptions().mutationMode === 'undoable';
    const selectionBeforeDelete = clearBeforeMutation ? selection.captureExplicit() : undefined;
    if (clearBeforeMutation) options.clearSelection();
    const current = () => activeDelete === token && scopeIsCurrent();
    try {
      await options.mutate([...confirmedRequest.ids]);
      if (!current()) return;
      options.clearSelection();
      await tick();
      if (!current()) return;
      open = false;
    } catch (error) {
      if (!current()) return;
      if (error instanceof DeleteManyPartialError) {
        selection.retainFailedIds(error.failedIds);
        options.reportError(options.messages.partial(error.failedIds.length, confirmedRequest.ids.length));
      } else {
        if (selectionBeforeDelete) selection.restoreExplicit(selectionBeforeDelete);
        options.reportError(options.messages.failure());
      }
      open = false;
    } finally {
      if (activeDelete === token) {
        activeDelete = undefined;
        pending = false;
        request = null;
      }
      await tick();
      await tick();
    }
  }

  return {
    get request() { return request; },
    get open() { return open; },
    get pending() { return pending; },
    get message() { return message; },
    requestDelete, requestBatchDelete, confirm, cancel, cancelBatchOnCriteriaChange, reset,
  };
}
