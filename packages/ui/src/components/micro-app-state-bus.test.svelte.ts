import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MicroAppStateBusIndicator from './MicroAppStateBusIndicator.svelte';
import { useMicroAppState } from './useMicroAppState.svelte.js';

describe('useMicroAppState and MicroAppStateBusIndicator suite', () => {
  it('broadcasts state message and tracks history in hook', () => {
    const bus = useMicroAppState({ channel: 'test_channel', appId: 'test_host' });
    const msg = bus.broadcast('test:event', { foo: 'bar' });

    expect(msg.type).toBe('test:event');
    expect(bus.messages.length).toBe(1);
    expect(bus.messages[0]?.payload).toEqual({ foo: 'bar' });
  });

  it('renders bus indicator component and sends broadcast', async () => {
    const onBroadcast = vi.fn();
    const { getByText, container } = render(MicroAppStateBusIndicator, {
      onBroadcast,
    });

    expect(getByText('微前端全局响应式状态总线 (MicroApp State Bus)')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="micro-app-state-bus"]')).toBeTruthy();

    const sendBtn = getByText('广播状态变更');
    await fireEvent.click(sendBtn);

    expect(onBroadcast).toHaveBeenCalled();
  });
});
