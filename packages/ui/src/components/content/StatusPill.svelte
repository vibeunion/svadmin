<script lang="ts">
  import { cn } from '../../utils.js';
  import StatusBadge from './StatusBadge.svelte';

  export type StatusPillTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

  interface Props {
    label: string;
    tone?: StatusPillTone;
    class?: string;
  }

  let { label, tone = 'neutral', class: className = '' }: Props = $props();
</script>

<StatusBadge status={tone} {label} class={cn('svadmin-status-pill', className)} />
