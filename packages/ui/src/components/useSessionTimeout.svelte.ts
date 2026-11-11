import { onDestroy } from 'svelte';

export interface UseSessionTimeoutOptions {
  /** Inactivity threshold in minutes before session expires (default: 15) */
  timeoutMinutes?: (number | (() => number)) | undefined;
  /** Warning countdown window in seconds before lock triggers (default: 60) */
  warningSeconds?: (number | (() => number)) | undefined;
  /** Whether the session timeout guard is actively monitoring (default: true) */
  enabled?: (boolean | (() => boolean)) | undefined;
  /** BroadcastChannel channel name for cross-tab sync (default: 'svadmin_session_sync') */
  channelName?: string | undefined;
  /** localStorage key for cross-window timestamp persistence (default: 'svadmin_session_activity') */
  storageKey?: string | undefined;
  /** Callback triggered when countdown warning begins */
  onWarning?: ((remainingSeconds: number) => void) | undefined;
  /** Callback triggered when session expires/locks */
  onTimeout?: (() => void) | undefined;
  /** Callback triggered when user extends session */
  onExtend?: (() => void) | undefined;
}

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const {
    timeoutMinutes = 15,
    warningSeconds = 60,
    enabled = true,
    channelName = 'svadmin_session_sync',
    storageKey = 'svadmin_session_activity',
    onWarning,
    onTimeout,
    onExtend,
  } = options;

  const resolvedTimeoutMinutes = typeof timeoutMinutes === 'function' ? timeoutMinutes() : timeoutMinutes;
  const resolvedWarningSeconds = typeof warningSeconds === 'function' ? warningSeconds() : warningSeconds;
  const timeoutMs = resolvedTimeoutMinutes * 60 * 1000;
  const warningMs = resolvedWarningSeconds * 1000;

  let lastActiveTimestamp = $state(Date.now());
  let remainingMs = $state(timeoutMs);
  let isWarning = $state(false);
  let isTimedOut = $state(false);

  let broadcastChannel: BroadcastChannel | null = null;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let lastThrottle = 0;

  const isEnabled = $derived(
    typeof enabled === 'function' ? enabled() : enabled,
  );

  const remainingSeconds = $derived(
    Math.max(0, Math.ceil(remainingMs / 1000)),
  );

  function syncActivityToStorage(timestamp: number) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, String(timestamp));
    } catch {
      // Storage unavailable
    }
  }

  function broadcastMessage(type: 'ACTIVE' | 'EXTEND' | 'LOCK', timestamp = Date.now()) {
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type, timestamp });
      } catch {
        // Channel post failed
      }
    }
    syncActivityToStorage(timestamp);
  }

  function recordUserActivity(broadcast = true) {
    if (!isEnabled || isTimedOut) return;
    const now = Date.now();
    // Throttle activity recording to at most once per second
    if (now - lastThrottle < 1000) return;
    lastThrottle = now;

    lastActiveTimestamp = now;
    remainingMs = timeoutMs;
    if (isWarning) {
      isWarning = false;
    }

    if (broadcast) {
      broadcastMessage('ACTIVE', now);
    }
  }

  function extend() {
    isWarning = false;
    isTimedOut = false;
    lastActiveTimestamp = Date.now();
    remainingMs = timeoutMs;
    broadcastMessage('EXTEND', lastActiveTimestamp);
    onExtend?.();
  }

  function lockNow() {
    isWarning = false;
    isTimedOut = true;
    remainingMs = 0;
    broadcastMessage('LOCK', Date.now());
    onTimeout?.();
  }

  function tick() {
    if (!isEnabled || isTimedOut) return;

    const now = Date.now();
    const elapsed = now - lastActiveTimestamp;
    const currentRemaining = Math.max(0, timeoutMs - elapsed);
    remainingMs = currentRemaining;

    if (currentRemaining <= 0) {
      isWarning = false;
      isTimedOut = true;
      onTimeout?.();
    } else if (currentRemaining <= warningMs) {
      if (!isWarning) {
        isWarning = true;
      }
      onWarning?.(Math.ceil(currentRemaining / 1000));
    } else {
      if (isWarning) {
        isWarning = false;
      }
    }
  }

  function handleStorageEvent(e: StorageEvent) {
    if (e.key === storageKey && e.newValue) {
      const remoteTime = Number(e.newValue);
      if (Number.isFinite(remoteTime) && remoteTime > lastActiveTimestamp) {
        lastActiveTimestamp = remoteTime;
        remainingMs = Math.max(0, timeoutMs - (Date.now() - remoteTime));
        if (isWarning) isWarning = false;
      }
    }
  }

  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown'];

  function handleDOMActivity() {
    recordUserActivity(true);
  }

  if (typeof window !== 'undefined') {
    // Setup BroadcastChannel for cross-tab sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel(channelName);
        broadcastChannel.onmessage = (event) => {
          const data = event.data as { type: string; timestamp?: number };
          if (data.type === 'ACTIVE' || data.type === 'EXTEND') {
            const time = data.timestamp ?? Date.now();
            lastActiveTimestamp = time;
            remainingMs = timeoutMs;
            if (isWarning) isWarning = false;
          } else if (data.type === 'LOCK') {
            isWarning = false;
            isTimedOut = true;
            remainingMs = 0;
            onTimeout?.();
          }
        };
      } catch {
        // Fallback to storage event
      }
    }

    // Storage event fallback
    window.addEventListener('storage', handleStorageEvent);

    // Attach activity listeners
    activityEvents.forEach((ev) => {
      window.addEventListener(ev, handleDOMActivity, { passive: true });
    });

    // Start timer tick every 1000ms
    timerId = setInterval(tick, 1000);
  }

  function destroy() {
    if (typeof window !== 'undefined') {
      if (timerId) clearInterval(timerId);
      window.removeEventListener('storage', handleStorageEvent);
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, handleDOMActivity);
      });
      if (broadcastChannel) {
        broadcastChannel.close();
        broadcastChannel = null;
      }
    }
  }

  try {
    onDestroy(destroy);
  } catch {
    // Standalone utility or test execution
  }

  return {
    get isWarning() {
      return isWarning;
    },
    get isTimedOut() {
      return isTimedOut;
    },
    get remainingSeconds() {
      return remainingSeconds;
    },
    get lastActiveTimestamp() {
      return lastActiveTimestamp;
    },
    extend,
    lockNow,
    recordActivity: () => recordUserActivity(false),
    destroy,
  };
}
