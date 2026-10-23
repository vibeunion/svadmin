<script lang="ts">
  import Cascader, { type CascaderOption } from '../../../packages/ui/src/components/Cascader.svelte';

  const asyncMode = new URLSearchParams(window.location.search).get('async') === 'true';
  const branch: CascaderOption = {
    value: 'parent',
    label: 'Parent',
    children: [{ value: 'child', label: 'Child', children: [{ value: 'grandchild', label: 'Grandchild' }] }],
  };
  const asyncParent: CascaderOption = { value: 'async-parent', label: 'Async parent', hasChildren: true };
  let options = $state<CascaderOption[]>(asyncMode
    ? [asyncParent, { value: 'async-leaf', label: 'Async leaf' }]
    : [branch, { value: 'other', label: 'Other' }]);
  let value = $state<(string | number)[] | undefined>();
  let changes = $state(0);
  let lastValue = $state('null');
  let loadCalls = $state(0);
  const pendingLoads = new Map<number, {
    resolve: (children: CascaderOption[]) => void;
    reject: (reason: unknown) => void;
  }>();

  function loadChildren(): Promise<CascaderOption[]> {
    loadCalls += 1;
    const call = loadCalls;
    return new Promise<CascaderOption[]>((resolve, reject) => {
      pendingLoads.set(call, { resolve, reject });
    });
  }

  function resolveCall(call: number, label: string): void {
    const pending = pendingLoads.get(call);
    if (!pending) return;
    pendingLoads.delete(call);
    pending.resolve([{ value: `loaded-${call}`, label }]);
  }

  function rejectCall(call: number): void {
    const pending = pendingLoads.get(call);
    if (!pending) return;
    pendingLoads.delete(call);
    pending.reject(new Error('PRIVATE_CASCADER_LOAD'));
  }

  function setParentDisabled(next: boolean): void {
    const parent = options.find(option => option.value === 'async-parent');
    if (parent) parent.disabled = next;
  }

  function makeLeaf(): void {
    options = [{ ...branch, isLeaf: true }, { value: 'other', label: 'Other' }];
  }
  function changed(next: (string | number)[] | undefined): void {
    value = next;
    lastValue = JSON.stringify(next ?? null);
    changes += 1;
  }
</script>

<main data-testid="cascader-fixture">
  {#if asyncMode}
    <button type="button" data-testid="resolve-call-1" onclick={() => resolveCall(1, 'Loaded first')}>Resolve call 1</button>
    <button type="button" data-testid="resolve-call-2" onclick={() => resolveCall(2, 'Loaded second')}>Resolve call 2</button>
    <button type="button" data-testid="reject-call-1" onclick={() => rejectCall(1)}>Reject call 1</button>
    <button type="button" data-testid="reject-call-2" onclick={() => rejectCall(2)}>Reject call 2</button>
    <button type="button" data-testid="disable-parent" onclick={() => setParentDisabled(true)}>Disable async parent</button>
    <button type="button" data-testid="enable-parent" onclick={() => setParentDisabled(false)}>Enable async parent</button>
  {:else}
    <button type="button" onclick={makeLeaf}>Make parent leaf</button>
  {/if}
  <Cascader {options} bind:value placeholder="Choose path" ariaLabel="Path"
    loadChildren={asyncMode ? loadChildren : undefined} onchange={changed} />
  <output data-testid="cascader-value">{lastValue}</output>
  <output data-testid="cascader-changes">{changes}</output>
  <output data-testid="cascader-load-calls">{loadCalls}</output>
</main>
