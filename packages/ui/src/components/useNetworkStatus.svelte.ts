export interface NetworkInformationLike {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: string, listener: EventListener) => void;
  removeEventListener?: (type: string, listener: EventListener) => void;
}

export interface NetworkStatusState {
  isOnline: boolean;
  isWeak: boolean;
  effectiveType: string;
  downlink: number | null;
  rtt: number | null;
  reconnectedAt: Date | null;
}

export interface UseNetworkStatusOptions {
  onOnline?: () => void;
  onOffline?: () => void;
  onReconnect?: (reconnectedAt: Date) => void;
}

export function useNetworkStatus(options: UseNetworkStatusOptions = {}) {
  let isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);
  let effectiveType = $state('unknown');
  let downlink = $state<number | null>(null);
  let rtt = $state<number | null>(null);
  let reconnectedAt = $state<Date | null>(null);

  const isWeak = $derived(
    effectiveType === '2g' ||
    effectiveType === 'slow-2g' ||
    (rtt != null && rtt > 1500) ||
    (downlink != null && downlink < 0.2),
  );

  function updateConnectionDetails() {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as Navigator & { connection?: NetworkInformationLike };
    if (nav.connection) {
      if (nav.connection.effectiveType) effectiveType = nav.connection.effectiveType;
      if (nav.connection.downlink != null) downlink = nav.connection.downlink;
      if (nav.connection.rtt != null) rtt = nav.connection.rtt;
    }
  }

  function handleOnline() {
    const wasOffline = !isOnline;
    isOnline = true;
    updateConnectionDetails();
    if (wasOffline) {
      const now = new Date();
      reconnectedAt = now;
      options.onReconnect?.(now);
    }
    options.onOnline?.();
  }

  function handleOffline() {
    isOnline = false;
    options.onOffline?.();
  }

  if (typeof window !== 'undefined') {
    updateConnectionDetails();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const nav = navigator as Navigator & { connection?: NetworkInformationLike };
    if (nav.connection?.addEventListener) {
      nav.connection.addEventListener('change', updateConnectionDetails);
    }
  }

  return {
    get isOnline() {
      return isOnline;
    },
    get isWeak() {
      return isWeak;
    },
    get effectiveType() {
      return effectiveType;
    },
    get downlink() {
      return downlink;
    },
    get rtt() {
      return rtt;
    },
    get reconnectedAt() {
      return reconnectedAt;
    },
    refresh: () => {
      if (typeof navigator !== 'undefined') {
        isOnline = navigator.onLine;
        updateConnectionDetails();
      }
    },
  };
}
