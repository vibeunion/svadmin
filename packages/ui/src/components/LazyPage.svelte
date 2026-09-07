<script module lang="ts">
  import type { Component } from 'svelte';

  export type LazyPageModule = {
    default: Component<never>;
  };

  export type LazyPageRenderable = Component<Record<string, unknown>>;
  export type LazyPageLoader = () => Promise<LazyPageModule>;

  const pagePromises = new WeakMap<object, Promise<unknown>>();

  export function loadLazyPage(loader: LazyPageLoader): Promise<LazyPageModule> {
    const cached = pagePromises.get(loader);
    if (cached) return cached as Promise<LazyPageModule>;

    const promise = loader();
    pagePromises.set(loader, promise);
    void promise.catch(() => pagePromises.delete(loader));
    return promise;
  }
</script>

<script lang="ts">
  let {
    loader,
    props,
  }: {
    loader: LazyPageLoader;
    props: Record<string, unknown>;
  } = $props();

  const pagePromise = $derived(loadLazyPage(loader));
</script>

{#await pagePromise}
  <div class="svadmin-u-60fbb7713999 svadmin-u-8a7a926578c8 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227" role="status" aria-live="polite">
    <span class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">Loading...</span>
  </div>
{:then pageModule}
  {@const Page = pageModule.default as unknown as LazyPageRenderable}
  <Page {...props} />
{:catch}
  <div class="svadmin-u-60fbb7713999 svadmin-u-8a7a926578c8 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227" role="alert">
    <span class="svadmin-u-fc7473ca09eb svadmin-u-811148b13d1e">Unable to load this page.</span>
  </div>
{/await}
