import { fireEvent, render, waitFor } from '@testing-library/svelte';
import {
  resetContext,
  type AuditEntry,
  type AuditLogProvider,
  type AuthProvider,
  type ChatProvider,
  type DataProvider,
  type ResourceDefinition,
} from '@svadmin/core';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScopedAsyncConsumersHost from './scoped-async-consumers.test-host.svelte';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function capturePredictionTimer() {
  const nativeSetTimeout = globalThis.setTimeout;
  let predictionCallback: (() => void) | null = null;

  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
    if (delay === 500 && typeof handler === 'function') {
      predictionCallback = () => handler(...args);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }
    return nativeSetTimeout(handler, delay, ...args);
  }) as typeof setTimeout);

  return () => {
    if (!predictionCallback) throw new Error('Expected the SmartSuggest debounce timer');
    const callback = predictionCallback;
    predictionCallback = null;
    callback();
  };
}

function createControlledChatProvider(reply: Deferred<string>) {
  const signals: AbortSignal[] = [];
  const sendMessage = vi.fn((_, options) => {
    if (options?.signal) signals.push(options.signal);
    return reply.promise;
  });
  return {
    provider: { sendMessage } as ChatProvider,
    sendMessage,
    signals,
  };
}

function createControlledStream() {
  const bufferedChunks: string[] = [];
  const chunkWaiters: Array<(chunk: string | null) => void> = [];
  const finalized = createDeferred<undefined>();

  function nextChunk(): Promise<string | null> {
    const buffered = bufferedChunks.shift();
    if (buffered !== undefined) return Promise.resolve(buffered);
    return new Promise((resolve) => chunkWaiters.push(resolve));
  }

  async function* generate(): AsyncGenerator<string, void, unknown> {
    try {
      while (true) {
        const chunk = await nextChunk();
        if (chunk === null) return;
        yield chunk;
      }
    } finally {
      finalized.resolve(undefined);
    }
  }

  return {
    generator: generate(),
    finalized: finalized.promise,
    push(chunk: string) {
      const waiter = chunkWaiters.shift();
      if (waiter) waiter(chunk);
      else bufferedChunks.push(chunk);
    },
  };
}

function createStreamingChatProvider(stream: ReturnType<typeof createControlledStream>) {
  const signals: AbortSignal[] = [];
  const sendMessage = vi.fn((_, options) => {
    if (options?.signal) signals.push(options.signal);
    return stream.generator;
  });
  return {
    provider: { sendMessage } as ChatProvider,
    sendMessage,
    signals,
  };
}

function createControlledAuditProvider(entries: Deferred<AuditEntry[]>) {
  const get = vi.fn(() => entries.promise);
  const provider: AuditLogProvider = {
    create: async () => ({ timestamp: '', action: 'create' }),
    get,
    update: async () => ({ timestamp: '', action: 'update' }),
  };
  return { provider, get };
}

function createSnapshotDataProvider(scope: string) {
  const getList = vi.fn(async () => ({ data: [{ id: scope, title: `${scope} title` }], total: 1 }));
  const provider = {
    getList,
    getOne: async () => ({ data: { id: scope } }),
    create: async () => ({ data: { id: scope } }),
    update: async () => ({ data: { id: scope } }),
    deleteOne: async () => ({ data: { id: scope } }),
    getApiUrl: () => `https://${scope}.example.test`,
  } as DataProvider;
  return { provider, getList };
}

function createSnapshotAuthProvider(scope: string, canUpdateProfile: boolean) {
  const updateProfile = vi.fn(async () => ({ success: true }));
  const provider: AuthProvider = {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: scope, name: `${scope} user` }),
    updatePassword: async () => ({ success: true }),
    getRoles: async () => [{ id: `${scope}-role`, name: `${scope} role` }],
    getRolePermissions: async () => ({}),
    ...(canUpdateProfile ? { updateProfile } : {}),
  };
  return { provider, updateProfile };
}

function createResource(name: string): ResourceDefinition {
  return { name, label: `${name} label`, fields: [] };
}

afterEach(() => {
  resetContext();
  vi.restoreAllMocks();
});

describe('scoped async consumers', () => {
  it('keeps a late InsightCard reply from an old provider and tenant out of the new scope', async () => {
    const staleReply = createDeferred<string>();
    const freshReply = createDeferred<string>();
    const staleProvider = createControlledChatProvider(staleReply);
    const freshProvider = createControlledChatProvider(freshReply);
    const view = render(ScopedAsyncConsumersHost, {
      consumer: 'insight',
      chatProvider: staleProvider.provider,
      tenant: { tenantId: 'tenant-old' },
      requestContext: 'old context',
    });

    await waitFor(() => expect(staleProvider.sendMessage).toHaveBeenCalledTimes(1));
    await view.rerender({
      consumer: 'insight',
      chatProvider: freshProvider.provider,
      tenant: { tenantId: 'tenant-new' },
      requestContext: 'new context',
    });
    await waitFor(() => expect(freshProvider.sendMessage).toHaveBeenCalledTimes(1));

    freshReply.resolve('fresh scoped insight');
    await waitFor(() => expect(view.getByText('fresh scoped insight')).not.toBeNull());
    staleReply.resolve('stale scoped insight');
    await staleReply.promise;
    await tick();

    expect(staleProvider.signals[0]?.aborted).toBe(true);
    expect(view.queryByText('stale scoped insight')).toBeNull();
    expect(view.getByText('fresh scoped insight')).not.toBeNull();
  });

  it('rejects stale async-iterator chunks and closes the stream after InsightCard unmount', async () => {
    const staleStream = createControlledStream();
    const freshStream = createControlledStream();
    const staleProvider = createStreamingChatProvider(staleStream);
    const freshProvider = createStreamingChatProvider(freshStream);
    const view = render(ScopedAsyncConsumersHost, {
      consumer: 'insight',
      chatProvider: staleProvider.provider,
      tenant: { tenantId: 'tenant-old' },
      requestContext: 'old context',
    });

    await waitFor(() => expect(staleProvider.sendMessage).toHaveBeenCalledTimes(1));
    await view.rerender({
      consumer: 'insight',
      chatProvider: freshProvider.provider,
      tenant: { tenantId: 'tenant-new' },
      requestContext: 'new context',
    });
    await waitFor(() => expect(freshProvider.sendMessage).toHaveBeenCalledTimes(1));

    freshStream.push('fresh stream insight');
    await waitFor(() => expect(view.getByText('fresh stream insight')).not.toBeNull());
    staleStream.push('stale stream insight');
    await staleStream.finalized;
    await tick();

    expect(staleProvider.signals[0]?.aborted).toBe(true);
    expect(view.queryByText('stale stream insight')).toBeNull();
    expect(view.getByText('fresh stream insight')).not.toBeNull();

    view.unmount();
    freshStream.push('stream chunk after destroy');
    await freshStream.finalized;

    expect(freshProvider.signals[0]?.aborted).toBe(true);
    expect(document.body.textContent).not.toContain('stream chunk after destroy');
  });

  it('keeps late audit entries from an old provider and tenant out of the new scope', async () => {
    const staleEntries = createDeferred<AuditEntry[]>();
    const freshEntries = createDeferred<AuditEntry[]>();
    const staleProvider = createControlledAuditProvider(staleEntries);
    const freshProvider = createControlledAuditProvider(freshEntries);
    const view = render(ScopedAsyncConsumersHost, {
      consumer: 'audit',
      auditLogProvider: staleProvider.provider,
      tenant: { tenantId: 'tenant-old' },
      requestContext: 'old-resource',
    });

    await waitFor(() => expect(staleProvider.get).toHaveBeenCalledTimes(1));
    await view.rerender({
      consumer: 'audit',
      auditLogProvider: freshProvider.provider,
      tenant: { tenantId: 'tenant-new' },
      requestContext: 'new-resource',
    });
    await waitFor(() => expect(freshProvider.get).toHaveBeenCalledTimes(1));

    freshEntries.resolve([{
      timestamp: '2026-08-11T00:00:00.000Z',
      action: 'update',
      userId: 'fresh-auditor',
    }]);
    await waitFor(() => expect(view.getByText('User: fresh-auditor')).not.toBeNull());
    staleEntries.resolve([{
      timestamp: '2026-08-10T00:00:00.000Z',
      action: 'delete',
      userId: 'stale-auditor',
    }]);
    await staleEntries.promise;
    await tick();

    expect(staleProvider.get).toHaveBeenCalledWith({
      resource: 'old-resource',
      meta: { recordId: 'shared-record', tenantId: 'tenant-old' },
    });
    expect(freshProvider.get).toHaveBeenCalledWith({
      resource: 'new-resource',
      meta: { recordId: 'shared-record', tenantId: 'tenant-new' },
    });
    expect(view.queryByText('User: stale-auditor')).toBeNull();
    expect(view.getByText('User: fresh-auditor')).not.toBeNull();
  });

  it('keeps a late CopilotPanel reply from an old page scope out of the new scope', async () => {
    const staleReply = createDeferred<string>();
    const freshReply = createDeferred<string>();
    const staleProvider = createControlledChatProvider(staleReply);
    const freshProvider = createControlledChatProvider(freshReply);
    const view = render(ScopedAsyncConsumersHost, {
      consumer: 'copilot',
      chatProvider: staleProvider.provider,
      tenant: { tenantId: 'tenant-old' },
      requestContext: 'old-resource',
    });

    await waitFor(() => expect(staleProvider.sendMessage).toHaveBeenCalledTimes(1));
    await view.rerender({
      consumer: 'copilot',
      chatProvider: freshProvider.provider,
      tenant: { tenantId: 'tenant-new' },
      requestContext: 'new-resource',
    });
    await waitFor(() => expect(freshProvider.sendMessage).toHaveBeenCalledTimes(1));

    freshReply.resolve('fresh copilot insight');
    await waitFor(() => expect(view.getByText('fresh copilot insight')).not.toBeNull());
    staleReply.resolve('stale copilot insight');
    await staleReply.promise;
    await tick();

    expect(staleProvider.signals[0]?.aborted).toBe(true);
    expect(view.queryByText('stale copilot insight')).toBeNull();
    expect(view.getByText('fresh copilot insight')).not.toBeNull();
    expect(view.getByText('new-resource')).not.toBeNull();
  });

  it('keeps a late AICommandBar reply out after closing and reopening in a new scope', async () => {
    const staleReply = createDeferred<string>();
    const freshReply = createDeferred<string>();
    const staleProvider = createControlledChatProvider(staleReply);
    const freshProvider = createControlledChatProvider(freshReply);
    const view = render(ScopedAsyncConsumersHost, {
      consumer: 'command',
      chatProvider: staleProvider.provider,
      resources: [createResource('old-command')],
      tenant: { tenantId: 'tenant-old' },
      requestContext: 'old-resource',
      consumerOpen: true,
    });

    const oldInput = await waitFor(() => view.getByPlaceholderText(/Search commands or ask AI/));
    expect(view.getByText('old-command label')).not.toBeNull();
    await fireEvent.input(oldInput, { target: { value: 'old command question' } });
    await fireEvent.keyDown(oldInput, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(staleProvider.sendMessage).toHaveBeenCalledTimes(1));

    await view.rerender({
      consumer: 'command',
      chatProvider: freshProvider.provider,
      resources: [createResource('fresh-command')],
      tenant: { tenantId: 'tenant-new' },
      requestContext: 'new-resource',
      consumerOpen: false,
    });
    await waitFor(() => expect(view.queryByPlaceholderText(/Search commands or ask AI/)).toBeNull());
    await view.rerender({
      consumer: 'command',
      chatProvider: freshProvider.provider,
      resources: [createResource('fresh-command')],
      tenant: { tenantId: 'tenant-new' },
      requestContext: 'new-resource',
      consumerOpen: true,
    });

    const freshInput = await waitFor(() => view.getByPlaceholderText(/Search commands or ask AI/));
    expect(view.queryByText('old-command label')).toBeNull();
    expect(view.getByText('fresh-command label')).not.toBeNull();
    await fireEvent.input(freshInput, { target: { value: 'fresh command question' } });
    await fireEvent.keyDown(freshInput, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(freshProvider.sendMessage).toHaveBeenCalledTimes(1));
    freshReply.resolve('fresh command answer');
    await waitFor(() => expect(view.getByText('fresh command answer')).not.toBeNull());
    staleReply.resolve('stale command answer');
    await staleReply.promise;
    await tick();

    expect(staleProvider.signals[0]?.aborted).toBe(true);
    expect(view.queryByText('stale command answer')).toBeNull();
    expect(view.getByText('fresh command answer')).not.toBeNull();
  });

  it('keeps a late SmartSuggest completion out after provider, tenant, and context change', async () => {
    const runPrediction = capturePredictionTimer();
    const staleReply = createDeferred<string>();
    const freshReply = createDeferred<string>();
    const staleProvider = createControlledChatProvider(staleReply);
    const freshProvider = createControlledChatProvider(freshReply);
    const view = render(ScopedAsyncConsumersHost, {
      consumer: 'suggest',
      chatProvider: staleProvider.provider,
      tenant: { tenantId: 'tenant-old' },
      requestContext: 'old form context',
      inputValue: '',
    });

    const input = view.getByRole('textbox');
    await fireEvent.input(input, { target: { value: 'old' } });
    runPrediction();
    await tick();
    expect(staleProvider.sendMessage).toHaveBeenCalledTimes(1);

    await view.rerender({
      consumer: 'suggest',
      chatProvider: freshProvider.provider,
      tenant: { tenantId: 'tenant-new' },
      requestContext: 'new form context',
      inputValue: '',
    });
    const freshInput = view.getByRole('textbox');
    await fireEvent.input(freshInput, { target: { value: 'fresh' } });
    runPrediction();
    await tick();
    expect(freshProvider.sendMessage).toHaveBeenCalledTimes(1);

    freshReply.resolve('fresh-current');
    await freshReply.promise;
    await tick();
    expect(view.getByText('-current')).not.toBeNull();
    staleReply.resolve('fresh-stale');
    await staleReply.promise;
    await tick();

    expect(staleProvider.signals[0]?.aborted).toBe(true);
    expect(view.queryByText('-stale')).toBeNull();
    expect(view.getByText('-current')).not.toBeNull();
  });

  it('reads provider capabilities and resources from the current AdminContext after rerender', async () => {
    const oldData = createSnapshotDataProvider('old-provider');
    const freshData = createSnapshotDataProvider('fresh-provider');
    const oldAuth = createSnapshotAuthProvider('old-auth', false);
    const freshAuth = createSnapshotAuthProvider('fresh-auth', true);
    const view = render(ScopedAsyncConsumersHost, {
      consumer: 'snapshots',
      dataProvider: { default: oldData.provider, oldAnalytics: oldData.provider },
      authProvider: oldAuth.provider,
      resources: [createResource('old-resource')],
      tenant: { tenantId: 'tenant-old' },
      requestContext: 'old-resource',
    });

    await waitFor(() => expect(view.getAllByText('old-auth role')).not.toHaveLength(0));
    expect(view.getAllByText('old-resource')).not.toHaveLength(0);
    expect(view.getByText('oldAnalytics')).not.toBeNull();
    expect(view.queryByRole('button', { name: 'Edit' })).toBeNull();

    await view.rerender({
      consumer: 'snapshots',
      dataProvider: { default: freshData.provider, freshAnalytics: freshData.provider },
      authProvider: freshAuth.provider,
      resources: [createResource('fresh-resource')],
      tenant: { tenantId: 'tenant-new' },
      requestContext: 'fresh-resource',
    });

    await waitFor(() => expect(view.getAllByText('fresh-auth role')).not.toHaveLength(0));
    expect(view.getAllByText('fresh-resource')).not.toHaveLength(0);
    expect(view.getByText('freshAnalytics')).not.toBeNull();

    const inferencer = view.getByTestId('snapshot-inferencer');
    const resourceSelect = inferencer.querySelector('select');
    if (!resourceSelect) throw new Error('Expected the snapshot inferencer resource selector');
    await fireEvent.change(resourceSelect, { target: { value: 'fresh-resource' } });
    await fireEvent.click(view.getByRole('button', { name: 'Infer Fields' }));
    await waitFor(() => expect(freshData.getList).toHaveBeenCalledWith({
      resource: 'fresh-resource',
      pagination: { current: 1, pageSize: 25 },
      meta: { tenantId: 'tenant-new' },
    }));
    expect(oldData.getList).not.toHaveBeenCalled();

    await fireEvent.click(view.getByRole('button', { name: 'Edit' }));
    await fireEvent.input(view.getByLabelText('Name'), { target: { value: 'updated profile' } });
    await fireEvent.click(view.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(freshAuth.updateProfile).toHaveBeenCalledWith({ name: 'updated profile' }));
    expect(oldAuth.updateProfile).not.toHaveBeenCalled();
  });

});
