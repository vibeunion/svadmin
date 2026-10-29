<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';

  const i18n = useTranslation();

  let { value, maxLength = 200 } = $props<{
    value: string | null | undefined;
    maxLength?: number;
  }>();

  const text = $derived(value ?? '');
  const truncated = $derived(text.length > maxLength);
  const display = $derived(truncated ? text.slice(0, maxLength) + '...' : text);

  let showFull = $state(false);
</script>

{#if !text}
  <span class="text-muted-foreground">—</span>
{:else}
  <div class="svadmin-rich-text prose prose-sm max-w-none">
    <p class="whitespace-pre-wrap text-sm leading-relaxed">
      {showFull ? text : display}
    </p>
    {#if truncated}
      <Button
        variant="link"
        size="sm"
        class="text-xs text-primary h-auto p-0"
        onclick={() => { showFull = !showFull; }}
      >
        {showFull ? i18n.t('common.showLess') : i18n.t('common.showMore')}
      </Button>
    {/if}
  </div>
{/if}
