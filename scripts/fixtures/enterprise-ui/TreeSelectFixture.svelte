<script lang="ts">
  import TreeSelect, { type TreeSelectOption } from '../../../packages/ui/src/components/TreeSelect.svelte';

  const searchable = new URLSearchParams(window.location.search).get('searchable') === 'true';
  const unmountOnFocus = new URLSearchParams(window.location.search).get('unmount') === 'true';
  const focusFixture = new URLSearchParams(window.location.search).get('focus') === 'true';
  const onlyLeafSelectable = new URLSearchParams(window.location.search).get('onlyLeaf') === 'true';
  const emptyResult = new URLSearchParams(window.location.search).get('empty') === 'true';
  const multiple = new URLSearchParams(window.location.search).get('single') !== 'true';
  let visible = $state(true);
  let componentDisabled = $state(false);
  const initialOptions: TreeSelectOption[] = [
    {
      value: 'engineering',
      label: 'Engineering',
      expanded: true,
      children: [
        { value: 'frontend', label: 'Frontend' },
        { value: 'backend', label: 'Backend' },
      ],
    },
    {
      value: 'sales',
      label: 'Sales',
      hasChildren: true,
    },
  ];

  let options = $state<TreeSelectOption[]>(new URLSearchParams(window.location.search).get('virtual') === 'true'
    ? Array.from({ length: 250 }, (_, value) => ({ value, label: `Department ${value}` }))
    : initialOptions);
  let value = $state<string | number | (string | number)[] | undefined>(multiple ? [] : undefined);
  let changes = $state(0);
  let loadCalls = $state(0);
  let resolveLoad: ((children: TreeSelectOption[]) => void) | undefined;
  let rejectLoad: ((reason: unknown) => void) | undefined;

  function loadChildren(): Promise<TreeSelectOption[]> {
    loadCalls += 1;
    return new Promise<TreeSelectOption[]>((resolve, reject) => {
      resolveLoad = resolve;
      rejectLoad = reject;
    });
  }

  function resolveSales(): void {
    resolveLoad?.(emptyResult ? [] : [
      { value: 'enterprise', label: 'Enterprise' },
      { value: 'mid-market', label: 'Mid-market' },
    ]);
    resolveLoad = undefined;
    rejectLoad = undefined;
  }

  function changed(next: string | number | (string | number)[] | undefined): void {
    value = next;
    changes += 1;
  }
</script>

<svelte:window onfocusin={(event) => {
  if (unmountOnFocus && event.target instanceof HTMLElement && event.target.matches('[role="treeitem"]')) visible = false;
}} />

<main data-testid="tree-select-fixture">
  {#if focusFixture}
    <label for="next-department-note">Department note</label>
    <input id="next-department-note" />
    <TreeSelect options={initialOptions} ariaLabel="Other departments" searchable />
  {/if}
  {#if visible}
  <TreeSelect
    options={options}
    bind:value
    {multiple}
    {onlyLeafSelectable}
    {searchable}
    disabled={componentDisabled}
    placeholder="Choose departments"
    ariaLabel="Departments"
    loadChildren={loadChildren}
    onchange={changed}
  />
  {/if}
  <button type="button" data-testid="resolve-sales" onclick={resolveSales}>Resolve Sales</button>
  <button type="button" data-testid="toggle-disabled" onclick={() => { componentDisabled = !componentDisabled; }}>Toggle disabled</button>
  <button type="button" data-testid="reject-sales" onclick={() => {
    rejectLoad?.(new Error('PRIVATE_TREE_LOAD'));
    resolveLoad = undefined;
    rejectLoad = undefined;
  }}>Reject Sales</button>
  <output data-testid="tree-value">{JSON.stringify(value)}</output>
  <output data-testid="tree-changes">{changes}</output>
  <output data-testid="tree-load-calls">{loadCalls}</output>
</main>
