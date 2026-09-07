<script lang="ts">
  import { useList, useOne, useMany } from './query-hooks.svelte';
  import { useInfiniteList, useSelect, useCustom } from './hooks.svelte';
  import { useForm } from './form-hooks.svelte';

  let { kind }: { kind: string } = $props();
  // Each test mounts a fixed hook kind; only observer presence changes.
  // svelte-ignore state_referenced_locally
  const initialKind = kind;
  if (initialKind === 'list') useList({ resource: 'posts' });
  else if (initialKind === 'one') useOne({ resource: 'posts', id: 1 });
  else if (initialKind === 'many') useMany({ resource: 'posts', ids: [1, 2] });
  else if (initialKind === 'infinite') useInfiniteList({ resource: 'posts' });
  else if (initialKind === 'select') useSelect({ resource: 'posts', defaultValue: [1, 2] });
  else if (initialKind === 'form') useForm({ resource: 'posts', action: 'edit', id: 1 });
  else if (initialKind === 'custom') useCustom({ url: '/posts/search', method: 'get' });
</script>
