import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, waitFor, within } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { resetContext, type TaskProvider, type TaskRecord } from '@svadmin/core';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import Host from './task-action.test-host.svelte';

const clients: QueryClient[] = [];
function mount(action: 'cancel' | 'retry', operation: TaskProvider['get'], reportErrors = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(queryClient);
  const provider: TaskProvider = {
    submit: async () => ({ id: 'one', wait: async () => ({ id: 'one' }) }),
    get: async id => ({ id }), [action]: operation,
  };
  const onSuccess = vi.fn();
  const onError = vi.fn();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const view = render(Host, { provider, action, queryClient, onSuccess, onError: reportErrors ? onError : undefined });
  return { view, provider, onSuccess, onError, invalidate };
}
function deferred() {
  let resolve!: (record: TaskRecord) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<TaskRecord>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function actionProvider(overrides: Partial<TaskProvider> = {}): TaskProvider {
  return {
    submit: async () => ({ id: 'one', wait: async () => ({ id: 'one' }) }),
    get: async id => ({ id }),
    ...overrides,
  };
}
function mountBoth(provider: TaskProvider, settings: {
  reportErrors?: boolean;
  surface?: 'actions' | 'list' | 'details';
  tasks?: TaskRecord[];
  onSelect?: (task: TaskRecord) => void;
  selectedTaskId?: string;
} = {}) {
  const { reportErrors = true, ...hostSettings } = settings;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(queryClient);
  const onSuccess = vi.fn();
  const onError = vi.fn();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const view = render(Host, {
    provider, action: 'both', queryClient, onSuccess,
    onError: reportErrors ? onError : undefined,
    ...hostSettings,
  });
  return { view, provider, queryClient, onSuccess, onError, invalidate };
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
    expect(app.view.queryByRole('alert')).toBeNull();
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

  it.each(['diagnostic', 'empty', 'non-error', 'invalid-receipt'] as const)(
    'provides default feedback for %s and retains an explicit retry', async failure => {
      const next = deferred();
      const operation = vi.fn<TaskProvider['get']>();
      if (failure === 'invalid-receipt') operation.mockResolvedValueOnce({ id: 'wrong' });
      else operation.mockRejectedValueOnce(failure === 'non-error' ? 'PRIVATE' : new Error(failure === 'empty' ? '' : 'PRIVATE'));
      operation.mockImplementationOnce(() => next.promise);
      const app = mount(action, operation, false);
      await fireEvent.click(app.view.getByRole('button'));
      const alert = await app.view.findByRole('alert');
      expect(alert.textContent).toContain('Unable to confirm the task action');
      expect(app.view.getByRole('button').getAttribute('aria-describedby')).toBe(alert.id);
      expect(app.view.container.textContent).not.toContain('PRIVATE');
      expect(operation).toHaveBeenCalledOnce();
      await app.view.wrapper.setLocale('zh-CN');
      expect(app.view.getByRole('alert').textContent).toBe('无法确认任务操作结果，请核对任务状态后再试。');
      expect(operation).toHaveBeenCalledOnce();
      await fireEvent.click(app.view.getByRole('button'));
      expect(app.view.queryByRole('alert')).toBeNull();
      expect(app.view.getByRole('button')).toHaveProperty('disabled', true);
      await act(async () => { next.resolve({ id: 'one' }); await next.promise; });
      await waitFor(() => expect(app.view.getByRole('button')).toHaveProperty('disabled', false));
      expect(app.view.queryByRole('alert')).toBeNull();
      expect(app.view.getByRole('button').hasAttribute('aria-describedby')).toBe(false);
      expect(operation).toHaveBeenCalledTimes(2);
    },
  );

  it.each(['task', 'tenant', 'provider'] as const)('clears default feedback after changing %s', async change => {
    const app = mount(action, async () => { throw new Error('PRIVATE'); }, false);
    await fireEvent.click(app.view.getByRole('button'));
    await app.view.findByRole('alert');
    if (change === 'task') await app.view.rerender({ taskId: 'two' });
    if (change === 'tenant') await app.view.rerender({ tenant: 'second' });
    if (change === 'provider') await app.view.rerender({ provider: { ...app.provider } });
    expect(app.view.queryByRole('alert')).toBeNull();
  });

  it('does not show a late failure in the new task context', async () => {
    const old = deferred();
    const app = mount(action, () => old.promise, false);
    await fireEvent.click(app.view.getByRole('button'));
    await app.view.rerender({ taskId: 'two' });
    await act(async () => { old.reject(new Error('PRIVATE')); await old.promise.catch(() => {}); });
    expect(app.view.queryByRole('alert')).toBeNull();
  });
});

describe('same-task retry and cancel coordination', () => {
  it.each(['resolve', 'reject'] as const)(
    'keeps the TaskList Cancel action locked until the removed Retry request settles (%s)',
    async outcome => {
      const pending = deferred();
      const retry = vi.fn<TaskProvider['retry']>(() => pending.promise);
      const cancel = vi.fn<TaskProvider['cancel']>(async (id: string) => ({ id, status: 'cancelled' }));
      const onSelect = vi.fn();
      const app = mountBoth(actionProvider({ retry, cancel }), {
        surface: 'list',
        tasks: [{ id: 'one', title: 'Action task', status: 'failed' }],
        onSelect,
        selectedTaskId: 'one',
      });
      const failedRow = app.view.getByRole('row', { name: /Action task/ });
      await fireEvent.click(within(failedRow).getByRole('button', { name: 'Retry', exact: true }));
      expect(retry).toHaveBeenCalledExactlyOnceWith('one');

      await app.view.rerender({ tasks: [{ id: 'one', title: 'Action task', status: 'running' }] });
      const runningRow = app.view.getByRole('row', { name: /Action task/ });
      expect(within(runningRow).queryByRole('button', { name: 'Retry', exact: true })).toBeNull();
      const cancelButton = within(runningRow).getByRole('button', { name: 'Cancel', exact: true });
      expect(cancelButton).toHaveProperty('disabled', true);
      await fireEvent.click(cancelButton);
      expect(cancel).not.toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
      expect(app.view.getByTestId('selected-task').textContent).toBe('one');

      await act(async () => {
        if (outcome === 'resolve') pending.resolve({ id: 'one', status: 'running' });
        else pending.reject(new Error('PRIVATE'));
        await pending.promise.catch(() => {});
      });
      await waitFor(() => expect(cancelButton).toHaveProperty('disabled', false));
      expect(cancel).not.toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    },
  );

  it('keeps claims independent across provider, tenant and task changes', async () => {
    const first = deferred();
    const retry = vi.fn<TaskProvider['retry']>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementation(async (id: string) => ({ id, status: 'pending' }));
    const app = mountBoth(actionProvider({ retry }));
    const retryButton = () => app.view.getByRole('button', { name: 'Retry', exact: true });

    await fireEvent.click(retryButton());
    expect(retry).toHaveBeenCalledExactlyOnceWith('one');
    await app.view.rerender({ taskId: 'two' });
    expect(retryButton()).toHaveProperty('disabled', false);
    await fireEvent.click(retryButton());
    expect(retry).toHaveBeenCalledTimes(2);
    await app.view.rerender({ tenant: 'second' });
    expect(retryButton()).toHaveProperty('disabled', false);
    await fireEvent.click(retryButton());
    expect(retry).toHaveBeenCalledTimes(3);

    const otherRetry = vi.fn<TaskProvider['retry']>(async (id: string) => ({ id, status: 'pending' }));
    await app.view.rerender({ provider: actionProvider({ retry: otherRetry }) });
    expect(retryButton()).toHaveProperty('disabled', false);
    await fireEvent.click(retryButton());
    expect(otherRetry).toHaveBeenCalledExactlyOnceWith('two');
    expect(retry).toHaveBeenCalledTimes(3);

    await act(async () => { first.resolve({ id: 'one', status: 'pending' }); await first.promise; });
  });

  it('keeps the same task locked when its action component remounts', async () => {
    const pending = deferred();
    const retry = vi.fn<TaskProvider['retry']>(() => pending.promise);
    const cancel = vi.fn<TaskProvider['cancel']>(async (id: string) => ({ id, status: 'cancelled' }));
    const provider = actionProvider({ retry, cancel });
    const app = mountBoth(provider);
    await fireEvent.click(app.view.getByRole('button', { name: 'Retry', exact: true }));
    expect(retry).toHaveBeenCalledOnce();

    app.view.unmount();
    const remounted = render(Host, {
      provider, action: 'both', queryClient: app.queryClient,
      onSuccess: app.onSuccess, onError: undefined,
    });
    const retryButton = remounted.getByRole('button', { name: 'Retry', exact: true });
    const cancelButton = remounted.getByRole('button', { name: 'Cancel', exact: true });
    expect(retryButton).toHaveProperty('disabled', true);
    expect(cancelButton).toHaveProperty('disabled', true);
    await fireEvent.click(cancelButton);
    expect(cancel).not.toHaveBeenCalled();

    await act(async () => { pending.resolve({ id: 'one', status: 'pending' }); await pending.promise; });
    await waitFor(() => expect(cancelButton).toHaveProperty('disabled', false));
    expect(cancel).not.toHaveBeenCalled();
  });

  it.each(['Retry', 'Cancel'] as const)('lets only the first %s run and blocks duplicate or sibling clicks', async first => {
    const retry = deferred();
    const cancel = deferred();
    const operations = {
      retry: vi.fn(() => retry.promise),
      cancel: vi.fn(() => cancel.promise),
    };
    const app = mountBoth(actionProvider(operations));
    const retryButton = app.view.getByRole('button', { name: 'Retry', exact: true });
    const cancelButton = app.view.getByRole('button', { name: 'Cancel', exact: true });
    const firstButton = first === 'Retry' ? retryButton : cancelButton;
    const siblingButton = first === 'Retry' ? cancelButton : retryButton;
    const firstOperation = first === 'Retry' ? operations.retry : operations.cancel;
    const siblingOperation = first === 'Retry' ? operations.cancel : operations.retry;
    const firstPending = first === 'Retry' ? retry : cancel;
    const siblingPending = first === 'Retry' ? cancel : retry;

    await fireEvent.click(firstButton);
    expect(firstOperation).toHaveBeenCalledExactlyOnceWith('one');
    expect(siblingOperation).not.toHaveBeenCalled();
    expect(retryButton).toHaveProperty('disabled', true);
    expect(cancelButton).toHaveProperty('disabled', true);

    await fireEvent.click(firstButton);
    await fireEvent.click(siblingButton);
    expect(firstOperation).toHaveBeenCalledOnce();
    expect(siblingOperation).not.toHaveBeenCalled();

    await act(async () => {
      firstPending.resolve({ id: 'one', status: first === 'Retry' ? 'pending' : 'cancelled' });
      await firstPending.promise;
    });
    await waitFor(() => expect(app.onSuccess).toHaveBeenCalledOnce());
    expect(retryButton).toHaveProperty('disabled', false);
    expect(cancelButton).toHaveProperty('disabled', false);

    await fireEvent.click(siblingButton);
    expect(siblingOperation).toHaveBeenCalledExactlyOnceWith('one');
    expect(retryButton).toHaveProperty('disabled', true);
    expect(cancelButton).toHaveProperty('disabled', true);

    await act(async () => {
      siblingPending.resolve({ id: 'one', status: first === 'Retry' ? 'cancelled' : 'pending' });
      await siblingPending.promise;
    });
    await waitFor(() => expect(app.onSuccess).toHaveBeenCalledTimes(2));
    expect(app.onError).not.toHaveBeenCalled();
    expect(retryButton).toHaveProperty('disabled', false);
    expect(cancelButton).toHaveProperty('disabled', false);
  });

  it('releases the sibling after failure and keeps explicit retry recovery', async () => {
    const nextRetry = deferred();
    const nextCancel = deferred();
    const retry = vi.fn<TaskProvider['retry']>()
      .mockRejectedValueOnce(new Error('PRIVATE'))
      .mockImplementationOnce(() => nextRetry.promise);
    const cancel = vi.fn<TaskProvider['cancel']>(() => nextCancel.promise);
    const app = mountBoth(actionProvider({ retry, cancel }), { reportErrors: false });
    const retryButton = app.view.getByRole('button', { name: 'Retry', exact: true });
    const cancelButton = app.view.getByRole('button', { name: 'Cancel', exact: true });

    await fireEvent.click(retryButton);
    const alert = await app.view.findByRole('alert');
    expect(alert.textContent).toContain('Unable to confirm the task action');
    expect(app.view.container.textContent).not.toContain('PRIVATE');
    expect(retryButton).toHaveProperty('disabled', false);
    expect(cancelButton).toHaveProperty('disabled', false);
    expect(app.onSuccess).not.toHaveBeenCalled();
    expect(app.invalidate).not.toHaveBeenCalled();
    expect(retry).toHaveBeenCalledOnce();
    expect(cancel).not.toHaveBeenCalled();

    await fireEvent.click(cancelButton);
    expect(cancel).toHaveBeenCalledExactlyOnceWith('one');
    expect(retry).toHaveBeenCalledOnce();
    expect(retryButton).toHaveProperty('disabled', true);
    expect(cancelButton).toHaveProperty('disabled', true);
    await act(async () => { nextCancel.resolve({ id: 'one', status: 'cancelled' }); await nextCancel.promise; });
    await waitFor(() => expect(app.onSuccess).toHaveBeenCalledOnce());
    expect(app.view.getByRole('alert')).toBeTruthy();

    await fireEvent.click(retryButton);
    expect(app.view.queryByRole('alert')).toBeNull();
    expect(retry).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalledOnce();
    expect(retryButton).toHaveProperty('disabled', true);
    expect(cancelButton).toHaveProperty('disabled', true);
    await act(async () => { nextRetry.resolve({ id: 'one', status: 'pending' }); await nextRetry.promise; });
    await waitFor(() => expect(app.onSuccess).toHaveBeenCalledTimes(2));
    expect(app.view.queryByRole('alert')).toBeNull();
  });

  it.each(['Retry', 'Cancel'] as const)('does not change the selected row when %s runs from another row', async label => {
    const provider = actionProvider({
      retry: vi.fn(async id => ({ id, status: 'pending' })),
      cancel: vi.fn(async id => ({ id, status: 'cancelled' })),
    });
    const onSelect = vi.fn();
    const tasks: TaskRecord[] = [
      { id: 'one', title: 'Selected task', status: 'failed' },
      { id: 'two', title: 'Action task', status: label === 'Retry' ? 'failed' : 'processing' },
    ];
    const app = mountBoth(provider, { surface: 'list', tasks, onSelect, selectedTaskId: 'one' });
    const actionRow = app.view.getByRole('row', { name: /Action task/ });

    await fireEvent.click(within(actionRow).getByRole('button', { name: label, exact: true }));
    await waitFor(() => expect(label === 'Retry' ? provider.retry : provider.cancel).toHaveBeenCalledOnce());
    expect(label === 'Retry' ? provider.retry : provider.cancel).toHaveBeenCalledWith('two');
    expect(label === 'Retry' ? provider.cancel : provider.retry).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    expect(app.view.getByTestId('selected-task').textContent).toBe('one');
  });

  it.each(['list', 'details'] as const)('does not render task actions the provider cannot perform on %s', surface => {
    const provider = actionProvider();
    const app = mountBoth(provider, {
      surface,
      tasks: [
        { id: 'one', title: 'Failed task', status: 'failed' },
        { id: 'two', title: 'Working task', status: 'processing' },
      ],
      onSelect: vi.fn(),
    });

    expect(app.view.queryByRole('button', { name: 'Retry', exact: true })).toBeNull();
    expect(app.view.queryByRole('button', { name: 'Cancel', exact: true })).toBeNull();
  });
});
