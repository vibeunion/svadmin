<script lang="ts">
  import { notification, useNotificationController } from '../notifications.svelte.js';

  let { label }: { label: string } = $props();
  const center = useNotificationController();
</script>

<button type="button" onclick={() => center.success(`${label} scoped`, 'from context', { duration: 0 })}>Scoped {label}</button>
<button type="button" onclick={() => notification.success(`${label} module`, 'from module', { duration: 0 })}>Module {label}</button>
