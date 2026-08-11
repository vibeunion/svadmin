import type { LiveEvent, LiveProvider } from '@svadmin/core';

export type SurfaceLiveMode = 'off' | 'auto';
export type SurfaceLiveProvider = Pick<LiveProvider, 'subscribe'>;

export interface SurfaceLiveError {
  readonly code: 'refresh_failed' | 'subscribe_failed' | 'unsubscribe_failed';
  readonly resource: string;
  readonly message: string;
}

export interface SurfaceLiveRefreshCoordinator {
  notify(resource: string, event: unknown): void;
  dispose(): void;
}

function liveEventHeader(event: unknown): Pick<LiveEvent, 'resource' | 'type'> | null {
  try {
    if (event === null || typeof event !== 'object' || Array.isArray(event)) return null;
    const prototype = Object.getPrototypeOf(event);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const resource = Object.getOwnPropertyDescriptor(event, 'resource');
    const type = Object.getOwnPropertyDescriptor(event, 'type');
    if (!resource || !('value' in resource) || typeof resource.value !== 'string') return null;
    if (!type || !('value' in type) || !['INSERT', 'UPDATE', 'DELETE'].includes(String(type.value))) return null;
    return { resource: resource.value, type: type.value as LiveEvent['type'] };
  } catch {
    return null;
  }
}

export function createSurfaceLiveRefreshCoordinator(
  refreshResource: (resource: string) => Promise<void>,
  onError?: (error: SurfaceLiveError) => void,
): SurfaceLiveRefreshCoordinator {
  const scheduledResources = new Set<string>();
  const runningResources = new Set<string>();
  const trailingResources = new Set<string>();
  let active = true;

  function schedule(resource: string): void {
    if (!active || scheduledResources.has(resource)) return;
    if (runningResources.has(resource)) {
      trailingResources.add(resource);
      return;
    }
    scheduledResources.add(resource);
    queueMicrotask(() => void run(resource));
  }

  async function run(resource: string): Promise<void> {
    scheduledResources.delete(resource);
    if (!active) return;
    runningResources.add(resource);
    try {
      await refreshResource(resource);
    } catch {
      onError?.({ code: 'refresh_failed', resource, message: 'Surface live refresh failed' });
    } finally {
      runningResources.delete(resource);
      if (active && trailingResources.delete(resource)) schedule(resource);
    }
  }

  return {
    notify(resource, event) {
      const header = liveEventHeader(event);
      if (header?.resource === resource) schedule(resource);
    },
    dispose() {
      active = false;
      scheduledResources.clear();
      trailingResources.clear();
    },
  };
}
