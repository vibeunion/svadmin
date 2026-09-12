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
  <span class="svadmin-u-bfa603190748">—</span>
{:else if display.status === 'invalid'}
  <span role="status" data-svadmin-invalid-field>{i18n.t('validation.invalidFormat')}</span>{:else}
  <div class="svadmin-u-da7c36cd8867">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      <Button
        variant="ghost"
        size="sm"
        class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e svadmin-u-b8f0a08ece1e svadmin-u-465609a240a8 svadmin-u-d8e0e382c67b"
        onclick={() => { expanded = !expanded; }}
      >
        {#if expanded}
          <ChevronDown class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        {:else}
          <ChevronRight class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        {/if}
        {expanded ? i18n.t('common.collapse') : i18n.t('common.expand')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e svadmin-u-b8f0a08ece1e svadmin-u-465609a240a8 svadmin-u-d8e0e382c67b"
        onclick={copyJson}
        aria-label={i18n.t('common.copy')}
      >
        {#if copied}
          <Check class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-76747e5e02ff" />
        {:else}
          <Copy class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        {/if}
      </Button>
    </div>
    {#if expanded}
      <pre class="svadmin-u-5f22e64f2282 svadmin-u-2ef11f1cb219 svadmin-u-eb6e8b881acd svadmin-u-359090c2d529 svadmin-u-73fc3fb18ceb svadmin-u-8aee2b07b47d svadmin-u-0e65706bcccd">{display.formatted}</pre>
    {:else}
      <code class="svadmin-u-359090c2d529 svadmin-u-0e65706bcccd svadmin-u-2ef11f1cb219 svadmin-u-45d828117213 svadmin-u-465609a240a8 svadmin-u-07389a777c1f">{display.preview}</code>    {/if}
  </div>
{/if}
