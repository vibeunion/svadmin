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
          iconClass: 'svadmin-u-afbdd13a380e',
        };
      case 'completed':
        return {
          label: translateStatus(normalizedStatus),
          variant: 'secondary' as const,
          icon: CheckCircle2,
          iconClass: 'svadmin-u-76747e5e02ff',
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
          iconClass: 'svadmin-u-bfa603190748',
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

<Badge variant={config.variant} class={`svadmin-u-58284b4ea568 ${className}`.trim()}>
  {#if showIcon}
    <Icon class={`svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c ${config.iconClass}`.trim()} />
  {/if}
  <span>{config.label}</span>
</Badge>
