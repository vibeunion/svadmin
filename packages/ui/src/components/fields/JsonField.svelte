<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { Copy, Check, ChevronDown, ChevronRight } from '@lucide/svelte';

  const i18n = useTranslation();

  let { value } = $props<{
    value: unknown;
  }>();

  let expanded = $state(false);
  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    return () => { if (copyTimer) clearTimeout(copyTimer); };
  });

  const formatted = $derived(
    value != null ? JSON.stringify(value, null, 2) : '—'
  );

  const preview = $derived(
    value != null ? JSON.stringify(value).slice(0, 80) + (JSON.stringify(value).length > 80 ? '...' : '') : '—'
  );

  function copyJson() {
    navigator.clipboard.writeText(formatted);
    copied = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copied = false; }, 2000);
  }
</script>

{#if value == null}
  <span class="text-muted-foreground">—</span>
{:else}
  <div class="space-y-1">
    <div class="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground h-auto py-0.5 px-1"
        onclick={() => { expanded = !expanded; }}
      >
        {#if expanded}
          <ChevronDown class="h-3 w-3" />
        {:else}
          <ChevronRight class="h-3 w-3" />
        {/if}
        {expanded ? i18n.t('common.collapse') : i18n.t('common.expand')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground h-auto py-0.5 px-1"
        onclick={copyJson}
        aria-label={i18n.t('common.copy')}
      >
        {#if copied}
          <Check class="h-3 w-3 text-success" />
        {:else}
          <Copy class="h-3 w-3" />
        {/if}
      </Button>
    </div>
    {#if expanded}
      <pre class="rounded-lg bg-muted p-3 text-xs overflow-auto max-h-64 font-mono">{formatted}</pre>
    {:else}
      <code class="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{preview}</code>
    {/if}
  </div>
{/if}
