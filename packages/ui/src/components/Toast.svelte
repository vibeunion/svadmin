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
  const isActiveHost = $derived(host?.isActive() ?? false);
  const theme = $derived(getResolvedTheme() === 'dark' ? 'dark' : 'light');

  onMount(() => {
    const registration = registerToastHost();
    host = registration;

    return () => registration.unregister();
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
    position: "top-right",
    richColors: true,
    closeButton: true,
    expand: false,
    visibleToasts: 3,
    theme,
    toastOptions: {
      classes: {
        toast: 'svadmin-u-79bf1259388b',
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
    class="svadmin-u-a4326536b8f5 svadmin-u-7bc555991dba svadmin-u-c1b9bd611950 svadmin-u-b2e7cc55921c svadmin-u-5a438c30beec svadmin-u-db5a366a0e21 svadmin-u-60fbb7713999 svadmin-u-aa6c1169cd77 svadmin-u-77a2a20e90d4 svadmin-u-6dfb687ea917 svadmin-u-5540f3495030 svadmin-u-9673d11dbf8a svadmin-u-dd317c20a8aa svadmin-u-8bd891360308"
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
