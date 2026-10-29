import type { useLog, useLogList } from './audit-hooks.svelte';
import type { useDrawer, useModal } from './utility-hooks.svelte';

export interface HooksParityState {
  log: ReturnType<typeof useLog>;
  list: ReturnType<typeof useLogList>;
  drawer: ReturnType<typeof useDrawer>;
  modal: ReturnType<typeof useModal>;
}
