<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';

  import { Ban, Clock3, Loader2, CheckCircle2, AlertTriangle, CircleDashed } from '@lucide/svelte';
  import { Badge } from './ui/badge/index.js';
  import { normalizeTaskStatus } from './task-utils.js';

  const i18n = useTranslation();

  let {
    status = 'pending',
    showIcon = true,
    class: className = '',
  } = $props<{
    status?: string;
    showIcon?: boolean;
    class?: string;
  }>();

  const normalizedStatus = $derived(String(status || 'pending').toLowerCase());
  const lifecycle = $derived(normalizeTaskStatus(normalizedStatus));

  function translateStatus(value: string) {
    const key = `task.status.${value}`;
    const translated = i18n.t(key);
    if (translated !== key) return translated;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  const config = $derived.by(() => {
    switch (lifecycle) {
      case 'processing':
        return {
          label: translateStatus(normalizedStatus),
          variant: 'default' as const,
          icon: Loader2,
          iconClass: 'animate-spin',
        };
      case 'completed':
        return {
          label: translateStatus(normalizedStatus),
          variant: 'secondary' as const,
          icon: CheckCircle2,
          iconClass: 'text-success',
        };
      case 'failed':
        return {
          label: translateStatus(normalizedStatus),
          variant: 'destructive' as const,
          icon: AlertTriangle,
          iconClass: '',
        };
      case 'cancelled':
        return {
          label: translateStatus(normalizedStatus),
          variant: 'outline' as const,
          icon: Ban,
          iconClass: 'text-muted-foreground',
        };
      case 'queued':
        return {
          label: translateStatus(normalizedStatus),
          variant: 'outline' as const,
          icon: CircleDashed,
          iconClass: '',
        };
      default:
        return {
          label: translateStatus(normalizedStatus),
          variant: 'outline' as const,
          icon: Clock3,
          iconClass: '',
        };
    }
  });

  const Icon = $derived(config.icon);
</script>

<Badge variant={config.variant} class={`gap-1.5 ${className}`.trim()}>
  {#if showIcon}
    <Icon class={`h-3.5 w-3.5 ${config.iconClass}`.trim()} />
  {/if}
  <span>{config.label}</span>
</Badge>
