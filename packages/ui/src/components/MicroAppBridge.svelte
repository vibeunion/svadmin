<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { useMicroAppEvent } from './useMicroAppEvent.svelte.js';

  export interface MicroAppBridgeProps {
    channel?: string | undefined;
    allowedOrigins?: string[] | undefined;
    appId?: string | undefined;
    class?: string | undefined;
    children?: Snippet | undefined;
  }

  let {
    channel = 'svadmin_microapp',
    allowedOrigins = ['*'],
    appId = 'main-bridge',
    class: className = '',
    children,
  }: MicroAppBridgeProps = $props();

  const i18n = useTranslation();

  const bridge = useMicroAppEvent({
    channel: untrack(() => channel),
    allowedOrigins: untrack(() => allowedOrigins),
  });

  bridge.on('PING', (_, event) => {
    if (event.source && typeof (event.source as Window).postMessage === 'function') {
      bridge.emit('PONG', { appId, status: 'ready' }, event.source as Window);
    }
  });

  bridge.on('SYNC_REQUEST', (_, event) => {
    if (event.source && typeof (event.source as Window).postMessage === 'function') {
      bridge.emit(
        'SYNC_RESPONSE',
        {
          locale: i18n.locale,
          timestamp: Date.now(),
        },
        event.source as Window,
      );
    }
  });
</script>

<div
  data-svadmin-component="MicroAppBridge"
  data-app-id={appId}
  data-channel={channel}
  class={cn('relative w-full', className)}
>
  {#if children}
    {@render children()}
  {/if}
</div>
