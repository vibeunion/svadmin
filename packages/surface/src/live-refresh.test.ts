import { describe, expect, test, vi } from 'vitest';
import { createSurfaceLiveRefreshCoordinator } from './live-refresh.js';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('Surface live refresh coordinator', () => {
  test('coalesces a same-tick event burst into one resource refresh', async () => {
    const refresh = vi.fn(async () => undefined);
    const coordinator = createSurfaceLiveRefreshCoordinator(refresh);
    const event = { type: 'UPDATE', resource: 'products', payload: { id: 1 } };

    coordinator.notify('products', event);
    coordinator.notify('products', event);
    coordinator.notify('products', event);
    await flushMicrotasks();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith('products');
  });

  test('allows at most one trailing refresh while a request is in flight', async () => {
    let finishFirst!: () => void;
    const first = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    const refresh = vi.fn(async () => {
      if (refresh.mock.calls.length === 1) await first;
    });
    const coordinator = createSurfaceLiveRefreshCoordinator(refresh);
    const event = { type: 'INSERT', resource: 'products', payload: {} };

    coordinator.notify('products', event);
    await flushMicrotasks();
    expect(refresh).toHaveBeenCalledTimes(1);
    coordinator.notify('products', event);
    coordinator.notify('products', event);
    coordinator.notify('products', event);
    finishFirst();
    await flushMicrotasks();
    await flushMicrotasks();

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  test('ignores mismatched, accessor, and disposed events with zero refreshes', async () => {
    const refresh = vi.fn(async () => undefined);
    const coordinator = createSurfaceLiveRefreshCoordinator(refresh);
    let accessorInvoked = false;
    const accessorEvent = { type: 'UPDATE', payload: {} };
    Object.defineProperty(accessorEvent, 'resource', {
      enumerable: true,
      get() {
        accessorInvoked = true;
        return 'products';
      },
    });

    coordinator.notify('products', { type: 'UPDATE', resource: 'orders', payload: {} });
    coordinator.notify('products', accessorEvent);
    coordinator.dispose();
    coordinator.notify('products', { type: 'UPDATE', resource: 'products', payload: {} });
    await flushMicrotasks();

    expect(accessorInvoked).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });
});
