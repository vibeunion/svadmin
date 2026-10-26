<script lang="ts">
  import { onMount } from 'svelte';

  type ProbeApi = {
    intercept(action: string, callback: (event: unknown) => false | undefined): void;
    on(action: string, callback: (event: unknown) => void): void;
    getState(): { selectedRows?: unknown };
  };
  type ProbeEdit = { readonly id: string; readonly column: string; readonly value: string | number };
  let { data = [], init }: {
    data?: readonly Record<string, unknown>[];
    init?: (api: ProbeApi) => void;
  } = $props();
  const interceptors = new Map<string, (event: unknown) => false | undefined>();
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  const api: ProbeApi = {
    intercept(action, callback) { interceptors.set(action, callback); },
    on(action, callback) { const current = listeners.get(action) ?? []; current.push(callback); listeners.set(action, current); },
    getState() { return { selectedRows: [] }; },
  };
  function triggerEdit(event: Event): void {
    const edit = (event as CustomEvent<ProbeEdit>).detail;
    if (!edit) return;
    interceptors.get('update-cell')?.({ id: edit.id, column: `column:${encodeURIComponent(edit.column)}`, value: edit.value });
  }
  function triggerRequest(event: Event): void {
    const range = (event as CustomEvent<unknown>).detail;
    for (const callback of listeners.get('request-data') ?? []) callback(range);
  }
  onMount(() => {
    init?.(api);
    window.addEventListener('svadmin-test-grid-edit', triggerEdit);
    window.addEventListener('svadmin-test-grid-request', triggerRequest);
    return () => {
      window.removeEventListener('svadmin-test-grid-edit', triggerEdit);
      window.removeEventListener('svadmin-test-grid-request', triggerRequest);
    };
  });
</script>

{#each data as row, index (index)}
  <p data-testid="grid-row">{Object.entries(row).filter(([key]) => key !== 'id').map(([, value]) => String(value)).join(' ')}</p>
{/each}
