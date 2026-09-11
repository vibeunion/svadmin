import { requireValue } from '../test/assertions';

import { describe,it,expect } from 'vitest';
import { useThemedLayoutContext } from './hooks.svelte';

describe('Svelte 5 Reactive Runes Compatibility',() => {

  it('verifies that sidebarCollapsed is correctly synchronized out of component lifecycle',() => {
    let observedValue=false;
    let layout: ReturnType<typeof useThemedLayoutContext>|undefined;

    const cleanup=$effect.root(() => {
      layout=useThemedLayoutContext();

      $effect(() => {
        observedValue=requireValue(layout).sidebarCollapsed;
      });
    });

    expect(observedValue).toBe(false);

    requireValue(layout).toggleSidebar();

    expect(requireValue(layout).sidebarCollapsed).toBe(true);

    cleanup();
  });
});
