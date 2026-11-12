export interface MicroAppStateMessage<T = unknown> {
  channel: string;
  type: string;
  payload: T;
  timestamp: number;
  senderAppId?: string | undefined;
}

export interface UseMicroAppStateOptions {
  channel?: string | undefined;
  appId?: string | undefined;
}

export function useMicroAppState(options: UseMicroAppStateOptions = {}) {
  const channelName = options.channel ?? 'svadmin_microapp_bus';
  const appId = options.appId ?? 'host_app';

  let messages = $state<MicroAppStateMessage[]>([]);
  let subscribersCount = $state(3);

  function broadcast<T = unknown>(type: string, payload: T) {
    const msg: MicroAppStateMessage<T> = {
      channel: channelName,
      type,
      payload,
      timestamp: Date.now(),
      senderAppId: appId,
    };
    messages = [msg, ...messages].slice(0, 50);

    if (typeof window !== 'undefined') {
      try {
        window.postMessage({ svadminMicroApp: true, ...msg }, '*');
      } catch {
        // Fallback for sandboxed environments
      }
    }
    return msg;
  }

  function clearMessages() {
    messages = [];
  }

  return {
    get messages() {
      return messages;
    },
    get subscribersCount() {
      return subscribersCount;
    },
    broadcast,
    clearMessages,
  };
}
