<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { Loader2, Check, X, Cloud } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';

  const i18n = useTranslation();

  let {
    status = 'idle',
    error,
  } = $props<{
    /** The current auto-save status */
    status?: 'idle' | 'loading' | 'success' | 'error';
    /** Optional error message */
    error?: string;
  }>();
</script>

<div class="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
  {#key status}
    <div class="flex items-center gap-2" in:fly={{ y: -8, duration: 200 }} out:fade={{ duration: 150 }}>
      {#if status === 'idle'}
        <Cloud class="h-4 w-4" aria-hidden="true" />
        <span>{i18n.t('autoSave.idle')}</span>
      {:else if status === 'loading'}
        <Loader2 class="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
        <span>{i18n.t('autoSave.saving')}</span>
      {:else if status === 'success'}
        <Check class="h-4 w-4 text-success" aria-hidden="true" />
        <span class="text-success">{i18n.t('autoSave.saved')}</span>
      {:else if status === 'error'}
        <X class="h-4 w-4 text-destructive" aria-hidden="true" />
        <span class="text-destructive" title={error}>{i18n.t('autoSave.error')}</span>
      {/if}
    </div>
  {/key}
</div>
