import { onDestroy } from 'svelte';

export interface MicroAppMessage<T = unknown> {
  channel: string;
  type: string;
  payload: T;
  sourceId?: string | undefined;
  timestamp: number;
}

export interface UseMicroAppEventOptions {
  channel?: string | undefined;
  allowedOrigins?: string[] | undefined;
}

export function useMicroAppEvent(options: UseMicroAppEventOptions = {}) {
  const { channel = 'svadmin_microapp', allowedOrigins = ['*'] } = options;

  type Handler = (payload: unknown, event: MessageEvent) => void;
  const handlers = new Map<string, Set<Handler>>();

  function handleMessage(event: MessageEvent) {
    if (allowedOrigins[0] !== '*' && !allowedOrigins.includes(event.origin)) {
      return;
    }

    const data = event.data as MicroAppMessage | undefined;
    if (!data || typeof data !== 'object' || data.channel !== channel) {
      return;
    }

    const listeners = handlers.get(data.type);
    if (listeners) {
      listeners.forEach((fn) => fn(data.payload, event));
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleMessage);
  }

  function emit<T>(type: string, payload: T, targetWindow: Window = window) {
    if (typeof window === 'undefined') return;
    const msg: MicroAppMessage<T> = {
      channel,
      type,
      payload,
      timestamp: Date.now(),
    };
    const targetOrigin = allowedOrigins[0] === '*' ? '*' : (allowedOrigins[0] ?? '*');
    targetWindow.postMessage(msg, targetOrigin);
  }

  function on(type: string, handler: Handler) {
    let set = handlers.get(type);
    if (!set) {
      set = new Set();
      handlers.set(type, set);
    }
    set.add(handler);

    return () => {
      set?.delete(handler);
    };
  }

  function destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', handleMessage);
    }
    handlers.clear();
  }

  try {
    onDestroy(destroy);
  } catch {
    // Standalone
  }

  return {
    emit,
    on,
    destroy,
  };
}
