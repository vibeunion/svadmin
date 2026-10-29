<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { Copy, Check, ChevronDown, ChevronRight } from '@lucide/svelte';
  import { formatJsonValue } from './json-value';

  const i18n = useTranslation();

  let { value } = $props<{
    value: unknown;
  }>();

  let expanded = $state(false);
  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;

  $effect(() => {
    return () => { destroyed = true; if (copyTimer) clearTimeout(copyTimer); };
  });

  const display = $derived(formatJsonValue(value));

  async function copyJson() {
    if (display.status !== 'valid') return;
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard?.writeText) return;
    try {
      await clipboard.writeText(display.formatted);
    } catch {
      return;
    }
    if (destroyed) return;
    copied = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copied = false; }, 2000);
  }
</script>

{#if display.status === 'empty'}
  <span class="text-muted-foreground">—</span>
{:else if display.status === 'invalid'}
  <span role="status" data-svadmin-invalid-field>{i18n.t('validation.invalidFormat')}</span>
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
      <pre class="rounded-lg bg-muted p-3 text-xs overflow-auto max-h-64 font-mono">{display.formatted}</pre>
    {:else}
      <code class="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{display.preview}</code>
    {/if}
  </div>
{/if}
