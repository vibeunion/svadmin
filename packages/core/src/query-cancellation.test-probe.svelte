<script lang="ts">
  import { Type } from '@sinclair/typebox';
  import { useList, useOne, useMany } from './query-hooks.svelte';
  import { useInfiniteList, useSelect } from './hooks.svelte';
  import { useForm } from './strict-hooks.svelte';
  import { useCustom } from './strict-command-hooks.svelte';
  import { defineResource } from './resource-contract';
  import { defineCommand } from './command-contract';

  let { kind }: { kind: string } = $props();
  const posts = defineResource('posts', {
    record: Type.Object({ id: Type.Number(), title: Type.String() }),
    update: Type.Object({ title: Type.Optional(Type.String()) }),
  });
  const search = defineCommand('search', {
    url: '/posts/search',
    method: 'get',
    input: Type.Object({}),
    output: Type.Object({}),
  });
  // Each test mounts a fixed hook kind; only observer presence changes.
  // svelte-ignore state_referenced_locally
  const initialKind = kind;
  if (initialKind === 'list') useList({ resource: 'posts' });
  else if (initialKind === 'one') useOne({ resource: 'posts', id: 1 });
  else if (initialKind === 'many') useMany({ resource: 'posts', ids: [1, 2] });
  else if (initialKind === 'infinite') useInfiniteList({ resource: 'posts' });
  else if (initialKind === 'select') useSelect({ resource: 'posts', defaultValue: [1, 2] });
  else if (initialKind === 'form') useForm({ resource: posts, action: 'edit', id: 1 });
  else if (initialKind === 'custom') useCustom({ command: search, input: {} });
</script>
