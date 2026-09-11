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
    <ListTodo class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
  </Button>
{:then { default: Drawer }}
  <Drawer bind:open {...definedOptions({ taskProvider, title, initialTab })} />
{:catch}
  <Button variant="ghost" size="icon" aria-label={`${resolvedTitle}: ${i18n.t('common.retry')}`} onclick={() => module = load()}>
    <RotateCcw class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
  </Button>
{/await}
