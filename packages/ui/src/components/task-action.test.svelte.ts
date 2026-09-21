import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { resetContext, type TaskProvider, type TaskRecord } from '@svadmin/core';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import Host from './task-action.test-host.svelte';

const clients: QueryClient[] = [];
function mount(action: 'cancel' | 'retry', operation: TaskProvider['get']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(queryClient);
  const provider: TaskProvider = {
    submit: async () => ({ id: 'one', wait: async () => ({ id: 'one' }) }),
    get: async id => ({ id }), [action]: operation,
  };
  const onSuccess = vi.fn();
  const onError = vi.fn();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const view = render(Host, { provider, action, queryClient, onSuccess, onError });
  return { view, provider, onSuccess, onError, invalidate };
}
function deferred() {
  let resolve!: (record: TaskRecord) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<TaskRecord>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  resetContext();
  vi.restoreAllMocks();
});
for (const action of ['cancel', 'retry'] as const) describe(`${action} task action`, () => {
  it('submits once while pending and validates success before invalidating', async () => {
    const pending = deferred();
    const operation = vi.fn(() => pending.promise);
    const app = mount(action, operation);
    const button = app.view.getByRole('button');
    await fireEvent.click(button);
    expect(button.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(button);
    expect(operation).toHaveBeenCalledExactlyOnceWith('one');
    await act(async () => { pending.resolve({ id: 'one', status: 'pending' }); await pending.promise; });
    await waitFor(() => expect(app.onSuccess).toHaveBeenCalledOnce());
    expect(app.invalidate).toHaveBeenCalledOnce();
    expect(app.onError).not.toHaveBeenCalled();
  });

  it.each(['task', 'tenant', 'provider', 'access', 'unmount', 'roundtrip'] as const)(
    'ignores old results after %s changes', async change => {
      const pending = deferred();
      const app = mount(action, () => pending.promise);
      await fireEvent.click(app.view.getByRole('button'));
      if (change === 'task') await app.view.rerender({ taskId: 'two' });
      if (change === 'tenant' || change === 'roundtrip') await app.view.rerender({ tenant: 'second' });
      if (change === 'roundtrip') await app.view.rerender({ tenant: 'first' });
      if (change === 'provider') await app.view.rerender({ provider: { ...app.provider } });
      if (change === 'access') await app.view.rerender({ access: { can: async () => ({ can: false }) } });
      if (change === 'unmount') app.view.unmount();
      await act(async () => { pending.resolve({ id: 'one' }); await pending.promise; });
      expect(app.onSuccess).not.toHaveBeenCalled();
      expect(app.onError).not.toHaveBeenCalled();
      expect(app.invalidate).not.toHaveBeenCalled();
    },
  );

  it('does not let an old failure release the next request or deliver its error', async () => {
    const old = deferred();
    const next = deferred();
    const operation = vi.fn<TaskProvider['get']>().mockImplementationOnce(() => old.promise).mockImplementationOnce(() => next.promise);
    const app = mount(action, operation);
    await fireEvent.click(app.view.getByRole('button'));
    await app.view.rerender({ taskId: 'two' });
    await fireEvent.click(app.view.getByRole('button'));
    await act(async () => { old.reject(new Error('PRIVATE')); await old.promise.catch(() => {}); });
    expect(app.view.getByRole('button').hasAttribute('disabled')).toBe(true);
    expect(app.onError).not.toHaveBeenCalled();
    await act(async () => { next.resolve({ id: 'two' }); await next.promise; });
    await waitFor(() => expect(app.onSuccess).toHaveBeenCalledOnce());
  });

  it('rejects a mismatched receipt and exposes only a sanitized error', async () => {
    const app = mount(action, async () => ({ id: 'wrong' }));
    await fireEvent.click(app.view.getByRole('button'));
    await waitFor(() => expect(app.onError).toHaveBeenCalledWith(expect.objectContaining({
      code: 'INVALID_TASK_RESPONSE', writeMayHaveSucceeded: true,
    })));
    expect(app.onSuccess).not.toHaveBeenCalled();
    expect(app.invalidate).not.toHaveBeenCalled();
  });

  it('does not report a cache refresh failure as a failed write', async () => {
    const app = mount(action, async id => ({ id }));
    app.invalidate.mockRejectedValue(new Error('cache failure'));
    await fireEvent.click(app.view.getByRole('button'));
    await waitFor(() => expect(app.onSuccess).toHaveBeenCalledOnce());
    expect(app.onError).not.toHaveBeenCalled();
  });

  it('does not send disabled or unsupported actions', async () => {
    const operation = vi.fn(async (id: string) => ({ id }));
    const app = mount(action, operation);
    await app.view.rerender({ disabled: true });
    await fireEvent.click(app.view.getByRole('button'));
    const { submit, get } = app.provider;
    await app.view.rerender({ disabled: false, provider: { submit, get } });
    expect(app.view.getByRole('button').hasAttribute('disabled')).toBe(true);
    await fireEvent.click(app.view.getByRole('button'));
    expect(operation).not.toHaveBeenCalled();
  });
});
