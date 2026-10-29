<script lang="ts">
  import { useLog, useLogList } from './audit-hooks.svelte';
  import { useDrawer, useModal } from './utility-hooks.svelte';
  import { useTitle } from './hooks.svelte';
  import type { HooksParityState } from './hooks-parity.test.types';

  let { title, onReady }: { title: string; onReady: (value: HooksParityState) => void } = $props();

  const log = useLog();
  const list = useLogList({ resource: 'posts' });
  const drawer = useDrawer({ syncWithLocation: true, param: 'drawer' });
  const modal = useModal({ defaultVisible: true });
  useTitle(() => title);
  $effect(() => onReady({ log, list, drawer, modal }));
</script>

<button data-testid="log" onclick={() => void log.log({ action: 'custom', resource: 'posts' })}>log</button>
<button data-testid="drawer-open" onclick={drawer.show}>open</button>
<button data-testid="drawer-close" onclick={drawer.close}>close</button>
<p data-testid="drawer-visible">{String(drawer.visible)}</p>
<p data-testid="modal-visible">{String(modal.visible)}</p>
