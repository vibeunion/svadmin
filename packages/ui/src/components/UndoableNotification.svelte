<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { Progress } from './ui/progress/index.js';
  import { useTranslation } from '@svadmin/core/i18n';

  import { slide } from 'svelte/transition';
  import { X, Undo2 } from '@lucide/svelte';

  const i18n = useTranslation();

  let { message, duration = 5000, embedded = false, managedExternally = false, onUndo, onTimeout } = $props<{
    message: string;
    duration?: number;
    embedded?: boolean;
    managedExternally?: boolean;
    onUndo: () => void;
    onTimeout: () => void;
  }>();

  let remaining = $state(0);
  let dismissed = $state(false);

  $effect(() => {
    remaining = duration;
    const startTime = Date.now();
    const totalMs = duration;
    const interval = setInterval(() => {
      remaining = totalMs - (Date.now() - startTime);
      if (remaining <= 0) {
        remaining = 0;
        clearInterval(interval);
        if (!dismissed && !managedExternally) {
          dismissed = true;
          onTimeout();
        }
      }
    }, 100);
    return () => clearInterval(interval);
  });

  function handleUndo() {
    dismissed = true;
    onUndo();
  }

  function handleDismiss() {
    dismissed = true;
    onTimeout();
  }

  const progressValue = $derived(remaining / duration * 100);
</script>

{#if !dismissed}
  <div
    class={embedded
      ? 'svadmin-u-7d5d4c29be2a svadmin-u-d89972fe17d6 svadmin-u-6da6a3c3f741 svadmin-u-2cd02d11d1af svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-cd0ad9a56558 svadmin-u-06bbb43166db'
      : 'svadmin-u-7bc555991dba svadmin-u-c1b9bd611950 svadmin-u-b2e7cc55921c svadmin-u-5a438c30beec svadmin-u-db5a366a0e21 svadmin-u-2cd02d11d1af svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-cd0ad9a56558 svadmin-u-06bbb43166db svadmin-u-6dfb687ea917 svadmin-u-5540f3495030 svadmin-u-9673d11dbf8a svadmin-u-dd317c20a8aa svadmin-u-8bd891360308'}
    role="status"
    aria-live="polite"
    transition:slide={{ duration: 250 }}
  >
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c svadmin-u-f0faeb26d656 svadmin-u-1b2d54a3fd12">
      <p class="svadmin-u-7e0b7cdf1a94 svadmin-u-170cee3ff4e4 svadmin-u-fc7473ca09eb svadmin-u-d4108abe6359">{message}</p>
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-2074a75bf2e7">
        <Button variant="ghost" size="sm" onclick={handleUndo} class="svadmin-u-e83a7042bc91 svadmin-u-20aaf08a7ed1">
          <Undo2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-618162408e7a" />
          {i18n.t('common.undo')}
        </Button>
        <Button variant="ghost" size="icon" class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828" onclick={handleDismiss} aria-label={i18n.t('common.close')}>
          <X class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        </Button>
      </div>
    </div>
    <Progress value={progressValue} class="svadmin-u-3a1268a4e17f svadmin-u-0c5e9137c7de" />
  </div>
{/if}
