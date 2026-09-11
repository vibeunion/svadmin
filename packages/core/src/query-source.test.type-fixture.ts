import type { QueryObserverResult } from '@tanstack/query-core';
import { replaceReactiveMembers, extendReactiveMembers } from './reactive-projection';
import type { createSessionQuery } from './session-query.svelte';
import type { captureAuthLiveScope } from './auth-hooks.svelte';

declare const query: QueryObserverResult<{ data: { id: number } }, unknown>;
const projected = extendReactiveMembers(query, { overtime: { elapsed: 0 } });
if (projected.isSuccess) {
  const id: number = projected.data.data.id;
  void id;
}
if (projected.status === 'pending') {
  const empty: undefined = projected.data;
  void empty;
}
const replacement = replaceReactiveMembers(query, { data: 'replacement' });
const text: string = replacement.data;
void text;
// @ts-expect-error Extra properties are not invented by the projection.
void projected.missing;
// @ts-expect-error An extension cannot overwrite existing query fields.
extendReactiveMembers(query, { data: 'invalid overwrite' });

function bind<O extends { resource: { name: string } }>(
  options: O,
): Omit<O, 'resource' | 'contract'> & { resource: string; contract: { name: string } } {
  return replaceReactiveMembers(options, {
    get resource() { return options.resource.name; },
    get contract() { return options.resource; },
  });
}
const bound = bind({ resource: { name: 'posts' }, enabled: true });
const enabled: boolean = bound.enabled;
void enabled;

declare const sessionQuery: ReturnType<typeof createSessionQuery<{ data: { id: number } }>>;
if (sessionQuery.isSuccess) {
  const id: number = sessionQuery.data.data.id;
  void id;
}
if (sessionQuery.isPending) {
  const empty: undefined = sessionQuery.data;
  void empty;
}
async function checkRefetch() {
  const result = await sessionQuery.refetch();
  if (result.isSuccess) {
    const id: number = result.data.data.id;
    void id;
  }
  // @ts-expect-error A pending or failed read is not known to contain a record.
  const id: number = result.data.data.id;
  void id;
}
void checkRefetch;

declare const scope: ReturnType<typeof captureAuthLiveScope>;
// @ts-expect-error Consumers cannot rewrite the originating session discriminator.
scope.cacheKey = 'replacement';
