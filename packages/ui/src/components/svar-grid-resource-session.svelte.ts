import { onDestroy, untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import type { Filter, Sort } from '@svadmin/core';
import type { SvarResourceReadRequest } from './SvarResourceRead.svelte';
import { SvarLoadCancelled, type SvarWindowPage } from './svar-grid-loading.js';
import type { SvarRecordId } from './svar-grid-operations.js';

/** Query workers remain descendants of the host AdminContext and QueryClientProvider. */
export function createSvarResourceReads<Scope extends object>(options: {
  scope: () => Scope;
  current: (scope: Scope) => boolean;
  authorize: (scope: Scope, parentId?: SvarRecordId) => Promise<boolean>;
  resourceName: () => string;
  dataScopeKey: () => string | number;
  primaryKey: () => string;
  childrenKey: () => string | undefined;
}) {
  const requests = new SvelteMap<number, SvarResourceReadRequest>();
  const pending = new Map<number, { scope: Scope; cancel: () => void }>();
  let sequence = 0;
  let alive = true;
  function cancelAll(): void { for (const entry of [...pending.values()]) entry.cancel(); }
  onDestroy(() => { alive = false; cancelAll(); });
  $effect.pre(() => {
    const scope = options.scope();
    const available = options.current(scope);
    untrack(() => {
      for (const entry of [...pending.values()]) if (!available || entry.scope !== scope) entry.cancel();
    });
  });
  async function read(input: {
    scope: Scope; signal: AbortSignal; pagination: { current: number; pageSize: number };
    filters: Filter[]; sorters: Sort[]; parentId?: SvarRecordId;
  }): Promise<SvarWindowPage> {
    const { scope, signal } = input;
    const current = () => alive && !signal.aborted && options.current(scope);
    if (!current()) throw new SvarLoadCancelled();
    if (!await options.authorize(scope, input.parentId)) throw new Error('Resource read access denied');
    if (!current()) throw new SvarLoadCancelled();
    return new Promise<SvarWindowPage>((resolve, reject) => {
      const id = ++sequence;
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true; signal.removeEventListener('abort', abort); pending.delete(id); requests.delete(id); callback();
      };
      const abort = () => finish(() => reject(new SvarLoadCancelled()));
      pending.set(id, { scope, cancel: abort });
      signal.addEventListener('abort', abort, { once: true });
      if (!current()) { abort(); return; }
      const childrenKey = options.childrenKey();
      requests.set(id, {
        resourceName: options.resourceName(), dataScopeKey: options.dataScopeKey(), primaryKey: options.primaryKey(),
        ...(childrenKey === undefined ? {} : { childrenKey }),
        pagination: { ...input.pagination }, filters: input.filters, sorters: input.sorters,
        resolve(page) { finish(() => current() ? resolve(page) : reject(new SvarLoadCancelled())); },
        reject(error) { finish(() => reject(current() ? error : new SvarLoadCancelled())); },
      });
    });
  }
  return { requests, read, cancelAll };
}
