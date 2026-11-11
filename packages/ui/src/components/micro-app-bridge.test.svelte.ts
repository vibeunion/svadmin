import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { useMicroAppEvent } from './useMicroAppEvent.svelte.js';
import MicroAppBridge from './MicroAppBridge.svelte';

describe('useMicroAppEvent and MicroAppBridge suite', () => {
  it('emits and listens to cross-window events', () => {
    const bridge = useMicroAppEvent({ channel: 'test_channel' });
    const handler = vi.fn();
    const unsubscribe = bridge.on('CUSTOM_MSG', handler);

    // Simulate postMessage
    const event = new MessageEvent('message', {
      data: {
        channel: 'test_channel',
        type: 'CUSTOM_MSG',
        payload: { status: 'ready' },
      },
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ready' }),
      expect.anything(),
    );

    unsubscribe();
    bridge.destroy();
  });

  it('renders MicroAppBridge container', () => {
    const view = render(MicroAppBridge, {
      appId: 'child-subapp',
      channel: 'test_bridge_channel',
    });

    expect(view.container.querySelector('[data-svadmin-component="MicroAppBridge"]')).toBeTruthy();
  });
});
