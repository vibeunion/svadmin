<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import type TaskQueueDrawer from './TaskQueueDrawer.svelte';
  import { definedOptions } from '@svadmin/core/options';
  import { useTranslation } from '@svadmin/core/i18n';
  import { ListTodo, RotateCcw } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';

  let { open = $bindable(false), taskProvider, title, initialTab }: ComponentProps<typeof TaskQueueDrawer> = $props();
  const i18n = useTranslation();
  const load = () => import('./TaskQueueDrawer.svelte');
  let module = $state(load());
  const resolvedTitle = $derived(title ?? i18n.t('task.drawerTitle'));
</script>

{#await module}
  <Button variant="ghost" size="icon" disabled aria-busy="true" aria-label={resolvedTitle}>
    <ListTodo class="h-4 w-4" />
  </Button>
{:then { default: Drawer }}
  <Drawer bind:open {...definedOptions({ taskProvider, title, initialTab })} />
{:catch}
  <Button variant="ghost" size="icon" aria-label={`${resolvedTitle}: ${i18n.t('common.retry')}`} onclick={() => module = load()}>
    <RotateCcw class="h-4 w-4" />
  </Button>
{/await}
