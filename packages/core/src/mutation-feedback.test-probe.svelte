<script module lang="ts">
  export type FeedbackOperation = 'create' | 'update' | 'delete';
  export interface FeedbackState {
    run: () => Promise<unknown>;
    ready: () => boolean;
  }
</script>

<script lang="ts">
  import { useCreate, useUpdateMany, useDeleteMany, useList } from './strict-hooks.svelte';
  import { useResourceContract } from './resource-binding.svelte';
  import { definedReactiveOptions } from './defined-options';

  let { operation, ids, silentSuccess, silentError, onReady, onSuccess, onError, onSettled }: {
    operation: FeedbackOperation;
    ids: number[];
    silentSuccess: boolean;
    silentError: boolean;
    onReady: (state: FeedbackState) => void;
    onSuccess: () => void;
    onError: () => void;
    onSettled: () => void;
  } = $props();
  const binding = useResourceContract(() => 'posts');
  const options = definedReactiveOptions({
    get resource() { return binding.resource; },
    get successNotification(): false | undefined { return silentSuccess ? false : undefined; },
    get errorNotification(): false | undefined { return silentError ? false : undefined; },
  });
  const create = useCreate(options);
  const update = useUpdateMany(options);
  const remove = useDeleteMany(options);
  const list = useList(() => ({ resource: binding.resource, errorNotification: false }));
  function run(): Promise<unknown> {
    const callbacks = { onSuccess, onError, onSettled };
    if (operation === 'create') return create.mutation.mutateAsync({ variables: { title: 'Saved' } }, callbacks);
    if (operation === 'update') return update.mutation.mutateAsync({ ids, variables: { title: 'Saved' } }, callbacks);
    return remove.mutation.mutateAsync({ ids }, callbacks);
  }
  $effect(() => onReady({ run, ready: () => list.isSuccess }));
</script>
