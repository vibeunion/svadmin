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

<div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748" role="status" aria-live="polite">
  {#key status}
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4" in:fly={{ y: -8, duration: 200 }} out:fade={{ duration: 150 }}>
      {#if status === 'idle'}
        <Cloud class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" aria-hidden="true" />
        <span>{i18n.t('autoSave.idle')}</span>
      {:else if status === 'loading'}
        <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e svadmin-u-20aaf08a7ed1" aria-hidden="true" />
        <span>{i18n.t('autoSave.saving')}</span>
      {:else if status === 'success'}
        <Check class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-76747e5e02ff" aria-hidden="true" />
        <span class="svadmin-u-76747e5e02ff">{i18n.t('autoSave.saved')}</span>
      {:else if status === 'error'}
        <X class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-811148b13d1e" aria-hidden="true" />
        <span class="svadmin-u-811148b13d1e" title={error}>{i18n.t('autoSave.error')}</span>
      {/if}
    </div>
  {/key}
</div>
