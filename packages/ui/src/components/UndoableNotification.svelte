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
      ? 'pointer-events-auto relative w-full overflow-hidden rounded-lg border bg-card shadow-lg'
      : 'fixed bottom-4 left-4 right-4 z-[100] overflow-hidden rounded-lg border bg-card shadow-lg sm:bottom-6 sm:left-1/2 sm:right-auto sm:w-[min(32rem,calc(100vw-3rem))] sm:-translate-x-1/2'}
    role="status"
    aria-live="polite"
    transition:slide={{ duration: 250 }}
  >
    <div class="flex items-center justify-between gap-3 px-4 py-3">
      <p class="min-w-0 break-words text-sm text-foreground">{message}</p>
      <div class="flex items-center gap-1 flex-shrink-0">
        <Button variant="ghost" size="sm" onclick={handleUndo} class="font-semibold text-primary">
          <Undo2 class="h-3.5 w-3.5 mr-1" />
          {i18n.t('common.undo')}
        </Button>
        <Button variant="ghost" size="icon" class="h-7 w-7" onclick={handleDismiss} aria-label={i18n.t('common.close')}>
          <X class="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
    <Progress value={progressValue} class="h-1 rounded-none" />
  </div>
{/if}
