<script lang="ts">
  import { onMount } from 'svelte';
  import { Toaster, toast as sonner, type ToasterProps } from 'svelte-sonner';
  import { getResolvedTheme, getToastQueue, consumeToastQueue, getPromiseQueue, consumePromiseQueue } from '@svadmin/core';
  import { registerToastHost, type ToastHostRegistration } from './toast-host.svelte.js';

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
        const options = { duration: t.duration, id: t.key ?? t.id };
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
        toast: 'font-sans',
      },
    }
  } satisfies ToasterProps);
</script>

{#if isActiveHost}
  <Toaster {...toasterProps} />
{/if}
