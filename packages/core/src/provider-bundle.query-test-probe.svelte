<script lang="ts">
  import { useCreate } from './strict-hooks.svelte';
  import { defineResource } from './resource-contract';
  import { Type } from '@sinclair/typebox';
  import { useList } from './query-hooks.svelte';
  import { useTask } from './task-hooks.svelte';
  import { useNotification } from './utility-hooks.svelte';

  let { instance, enabled }: { instance: string; enabled: boolean } = $props();
  const query = useList(() => ({
    resource: 'posts',
    queryOptions: { enabled },
  }));
  const contract = defineResource('posts', {
    record: Type.Object({ id: Type.String() }), create: Type.Object({ title: Type.String() }),
  });
  const create = useCreate({ resource: contract });
  const task = useTask({
    taskId: 'shared-task',
    queryOptions: {
      get enabled() { return enabled; },
    },
  });
  const notification = useNotification();

  async function createResource(): Promise<void> {
    await create.mutation.mutateAsync({
      variables: { title: `${instance}-created` },
    });
  }
</script>

<button data-testid={`${instance}-create`} onclick={createResource}>create</button>
<button data-testid={`${instance}-notify`} onclick={() => notification.open(`${instance}-notice`)}>notify</button>
<output data-testid={`${instance}-query`}>{query.status}</output>
<output data-testid={`${instance}-task`}>{task.data?.title ?? ''}</output>
