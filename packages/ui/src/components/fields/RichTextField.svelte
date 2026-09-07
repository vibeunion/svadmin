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
  <span class="svadmin-u-bfa603190748">—</span>
{:else}
  <div class="svadmin-rich-text prose prose-sm svadmin-u-2191c1456297">
    <p class="svadmin-u-a2edcb1a3a6b svadmin-u-fc7473ca09eb svadmin-u-6b189c6edadb">
      {showFull ? text : display}
    </p>
    {#if truncated}
      <Button
        variant="link"
        size="sm"
        class="svadmin-u-359090c2d529 svadmin-u-20aaf08a7ed1 svadmin-u-b8f0a08ece1e svadmin-u-8a539c7fe216"
        onclick={() => { showFull = !showFull; }}
      >
        {showFull ? i18n.t('common.showLess') : i18n.t('common.showMore')}
      </Button>
    {/if}
  </div>
{/if}
