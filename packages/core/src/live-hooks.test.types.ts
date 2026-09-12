import type { LiveEvent } from './live.svelte';
import type { captureAuthLiveScope } from './auth-hooks.svelte';
import type { useInvalidate } from './strict-hooks.svelte';

export interface LiveHookTestState {
  publish: (event: LiveEvent) => Promise<void>;
  source: () => string;
  authScope: () => ReturnType<typeof captureAuthLiveScope>;
  invalidate: ReturnType<typeof useInvalidate>;
}
