<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  import { onMount } from 'svelte';
  import { Toaster, toast as sonner, type ToasterProps } from 'svelte-sonner';
  import {
    consumePromiseQueue,
    consumeToastQueue,
    getPromiseQueue,
    getResolvedTheme,
    getToastQueue,
    getToasts,
    removeToast,
  } from '@svadmin/core';
  import { registerToastHost, type ToastHostRegistration } from './toast-host.svelte.js';
  import UndoableNotification from './UndoableNotification.svelte';

  let host = $state<ToastHostRegistration | null>(null);
  let sheetOpen = $state(false);
  const isActiveHost = $derived(host?.isActive() ?? false);
  const theme = $derived(getResolvedTheme() === 'dark' ? 'dark' : 'light');
  const toastPosition = $derived<'top-right' | 'bottom-left'>(sheetOpen ? 'bottom-left' : 'top-right');

  onMount(() => {
    const syncSheetState = (): void => {
      sheetOpen = document.querySelector('.svadmin-sheet-panel') !== null;
    };
    syncSheetState();
    const sheetObserver = new MutationObserver(syncSheetState);
    sheetObserver.observe(document.body, { childList: true, subtree: true });
    const registration = registerToastHost();
    host = registration;

    return () => {
      sheetObserver.disconnect();
      registration.unregister();
    };
  });

  $effect(() => {
    if (!isActiveHost) return;
    const queue = getToastQueue();
    if (queue.length > 0) {
      for (const t of queue) {
        const options = definedOptions({ duration: t.duration, id: t.key ?? t.id });
        switch (t.type) {
          case 'success': sonner.success(t.message, options); break;
          case 'error': sonner.error(t.message, options); break;
          case 'warning': sonner.warning(t.message, options); break;
          case 'info': sonner.info(t.message, options); break;
        }
      }
      consumeToastQueue();
    }
  });

  $effect(() => {
    if (!isActiveHost) return;
    const pQueue = getPromiseQueue();
    if (pQueue.length > 0) {
      for (const p of pQueue) {
        sonner.promise(p.promise, p.opts);
      }
      consumePromiseQueue();
    }
  });

  const toasterProps = $derived({
    position: toastPosition,
    richColors: true,
    closeButton: true,
    expand: false,
    visibleToasts: 3,
    theme,
    toastOptions: {
      classes: {
        toast: 'font-sans',
      },
    }
  } satisfies ToasterProps);

  function undo(id: number, callback?: () => void): void {
    removeToast(id);
    callback?.();
  }

  function commit(id: number, callback?: () => void): void {
    removeToast(id);
    callback?.();
  }
</script>

{#if isActiveHost}
  <Toaster {...toasterProps} />
  <div
    class="pointer-events-none fixed bottom-4 left-4 right-4 z-[100] flex flex-col-reverse gap-2 sm:bottom-6 sm:left-1/2 sm:right-auto sm:w-[min(32rem,calc(100vw-3rem))] sm:-translate-x-1/2"
    data-svadmin-undo-stack
  >
    {#each getToasts().slice(-3) as item (item.id)}
      <UndoableNotification
        message={item.message}
        {...definedOptions({ "duration": item.duration })}
        embedded
        managedExternally
        onUndo={() => undo(item.id, item.onUndo)}
        onTimeout={() => commit(item.id, item.onTimeout)}
      />
    {/each}
  </div>
{/if}
