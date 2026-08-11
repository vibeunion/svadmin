import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { useForm } from './form-hooks.svelte';
import { flushSync } from 'svelte';

interface MockMutationOptions {
  onMutate?: (variables: unknown) => unknown | Promise<unknown>;
  mutationFn?: (variables: unknown) => unknown | Promise<unknown>;
  onSuccess?: (data: unknown, variables: unknown, context: unknown) => unknown | Promise<unknown>;
  onError?: (error: unknown, variables: unknown, context: unknown) => unknown | Promise<unknown>;
  onSettled?: (data: unknown, error: unknown, variables: unknown, context: unknown) => unknown | Promise<unknown>;
}

type MockMutationOptionsFactory = MockMutationOptions | (() => MockMutationOptions);

class OpaqueFormValue {
  constructor(readonly label: string) {}
}

const providerMocks = vi.hoisted(() => ({
  update: vi.fn(),
  navigate: vi.fn(async () => {}),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  queryData: { data: { id: 1, title: 'Original' } } as { data: Record<string, unknown> },
}));

vi.mock('./context.svelte', () => {
  const getDataProviderForResource = () => ({
    getOne: vi.fn(),
    create: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    update: providerMocks.update,
  });
  const getResource = () => ({ name: 'posts', primaryKey: 'id' });
  return {
    captureAdminContext: () => ({
      providers: null,
      authProvider: null,
      resources: [getResource()],
      routerProvider: undefined,
      liveProvider: undefined,
      taskProvider: undefined,
      getDataProvider: () => getDataProviderForResource(),
      getDataProviderNames: () => ['default'],
      getDataProviderForResource,
      getResource,
      getProviderMeta: () => undefined,
      currentPath: () => '/posts',
      formatLink: (path: string) => path,
      navigate: providerMocks.navigate,
      back: vi.fn(),
    }),
    getDataProviderForResource,
    getLiveProvider: () => undefined,
    useResource: () => ({ name: 'posts' }),
    getResource,
    useRouterContext: () => ({ navigate: vi.fn() }),
    useTranslate: () => (key: string) => key,
    useNotification: () => ({ open: vi.fn(), close: vi.fn() })
  };
});

vi.mock('@tanstack/svelte-query', () => {
  return {
    useQueryClient: () => ({
      invalidateQueries: providerMocks.invalidateQueries,
    }),
    createQuery: () => ({ data: providerMocks.queryData, isPending: false }),
    createMutation: (optionsFactory: MockMutationOptionsFactory) => {
      let isPending = false;
      const mutateAsync = vi.fn(async (variables: unknown) => {
        const options = typeof optionsFactory === 'function' ? optionsFactory() : optionsFactory;
        let context: unknown;
        let data: unknown;
        let error: unknown;
        isPending = true;
        try {
          context = await options.onMutate?.(variables);
          data = await options.mutationFn?.(variables) ?? { data: {} };
          await options.onSuccess?.(data, variables, context);
          return data;
        } catch (caught) {
          error = caught;
          await options.onError?.(caught, variables, context);
          throw caught;
        } finally {
          await options.onSettled?.(data, error, variables, context);
          setTimeout(() => { isPending = false; }, 0);
        }
      });

      return {
        mutate: vi.fn((variables: unknown) => { void mutateAsync(variables); }),
        mutateAsync,
        get isPending() { return isPending; },
      };
    }
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function mountForm(options: NonNullable<Parameters<typeof useForm>[0]>) {
  let mountedForm: ReturnType<typeof useForm> | undefined;
  const cleanup = $effect.root(() => {
    mountedForm = useForm(options);
  });
  flushSync();
  if (!mountedForm) throw new Error('useForm did not initialize');
  return { form: mountedForm, cleanup };
}

function requestAt<T>(requests: T[], index: number): T {
  const request = requests[index];
  if (!request) throw new Error(`Missing request at index ${index}`);
  return request;
}

describe('useForm - Headless Svelte 5 Compatibility', () => {

  beforeEach(() => {
    vi.useFakeTimers();
    providerMocks.update.mockReset();
    providerMocks.navigate.mockClear();
    providerMocks.invalidateQueries.mockClear();
    providerMocks.queryData = { data: { id: 1, title: 'Original' } };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('preserves reactive proxy data bindings safely across Svelte boundaries', () => {
    const { form, cleanup } = mountForm({
      action: 'create',
      resource: 'posts'
    });
    
    // Properly use setFieldValue which guarantees state sync in svadmin forms
    form.setFieldValue('title', 'Reactive Test');
    
    flushSync();
    
    // The internal $state proxy absorbs this mutation
    expect(form.values.title).toBe('Reactive Test');
    
    cleanup();
  });

  it('resets nested values from an independent default-value baseline', () => {
    const defaultValues = {
      settings: {
        profile: { displayName: 'Initial name' },
        sections: [{ title: 'Initial section' }],
      },
    };
    const { form, cleanup } = mountForm({
      action: 'create',
      resource: 'posts',
      defaultValues,
    });

    const settings = form.values.settings as typeof defaultValues.settings;
    settings.profile.displayName = 'Changed name';
    requestAt(settings.sections, 0).title = 'Changed section';
    form.reset();

    expect(form.values.settings).toEqual({
      profile: { displayName: 'Initial name' },
      sections: [{ title: 'Initial section' }],
    });

    const resetSettings = form.values.settings as typeof defaultValues.settings;
    resetSettings.profile.displayName = 'Changed after reset';
    requestAt(resetSettings.sections, 0).title = 'Changed after reset';
    form.reset();

    expect(form.values.settings).toEqual({
      profile: { displayName: 'Initial name' },
      sections: [{ title: 'Initial section' }],
    });
    expect(defaultValues.settings).toEqual({
      profile: { displayName: 'Initial name' },
      sections: [{ title: 'Initial section' }],
    });
    cleanup();
  });

  it('resets nested query values from an independent record baseline', () => {
    providerMocks.queryData = {
      data: {
        id: 1,
        settings: { profile: { displayName: 'Queried name' } },
      },
    };
    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
    });

    (form.values.settings as { profile: { displayName: string } }).profile.displayName = 'Changed query value';
    form.reset();
    expect(form.values.settings).toEqual({ profile: { displayName: 'Queried name' } });

    (form.values.settings as { profile: { displayName: string } }).profile.displayName = 'Changed after reset';
    form.reset();
    expect(form.values.settings).toEqual({ profile: { displayName: 'Queried name' } });
    cleanup();
  });

  it('queues the latest autoSave change while a previous request is pending', async () => {
    const pending: Array<(value: { data: { id: number } }) => void> = [];
    providerMocks.update.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    
    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 }
    });

    form.setFieldValue('title', 'First title');
    await vi.advanceTimersByTimeAsync(10);

    expect(providerMocks.update).toHaveBeenCalledTimes(1);
    expect(providerMocks.update.mock.calls[0]?.[0]).toMatchObject({
      variables: { title: 'First title' },
    });

    form.setFieldValue('title', 'Latest title');
    await vi.advanceTimersByTimeAsync(10);
    expect(providerMocks.update).toHaveBeenCalledTimes(1);

    pending[0]?.({ data: { id: 1 } });
    await vi.advanceTimersByTimeAsync(10);

    expect(providerMocks.update).toHaveBeenCalledTimes(2);
    expect(providerMocks.update.mock.calls[1]?.[0]).toMatchObject({
      variables: { title: 'Latest title' },
    });

    pending[1]?.({ data: { id: 1 } });
    await vi.advanceTimersByTimeAsync(0);
    cleanup();
  });

  it('cancels a queued autoSave when the form switches to another record', async () => {
    providerMocks.update.mockResolvedValue({ data: { id: 1 } });

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 },
    });

    form.setFieldValue('title', 'Record A queued value');
    form.setId(2);
    form.values.title = 'Record B loaded value';

    await vi.advanceTimersByTimeAsync(10);

    expect(providerMocks.update).not.toHaveBeenCalled();
    expect(form.id).toBe(2);
    expect(form.values.title).toBe('Record B loaded value');
    expect(form.isDirty).toBe(false);
    cleanup();
  });

  it('persists the value snapshot captured when autoSave was scheduled', async () => {
    providerMocks.update.mockResolvedValue({ data: { id: 1 } });

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 },
    });

    form.setFieldValue('title', 'Scheduled snapshot');
    form.values.title = 'Unscheduled direct mutation';

    await vi.advanceTimersByTimeAsync(10);

    expect(providerMocks.update).toHaveBeenCalledOnce();
    expect(providerMocks.update.mock.calls[0]?.[0]).toMatchObject({
      id: 1,
      variables: { title: 'Scheduled snapshot' },
    });
    cleanup();
  });

  it('deeply snapshots nested values when autoSave is scheduled', async () => {
    providerMocks.update.mockResolvedValue({ data: { id: 1 } });

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 },
    });

    form.setFieldValue('settings', {
      profile: { displayName: 'Scheduled name' },
      sections: [{ title: 'Scheduled section' }],
    });

    const settings = form.values.settings as {
      profile: { displayName: string };
      sections: Array<{ title: string }>;
    };
    settings.profile.displayName = 'Mutated before debounce';
    requestAt(settings.sections, 0).title = 'Mutated before debounce';

    await vi.advanceTimersByTimeAsync(10);

    expect(providerMocks.update).toHaveBeenCalledOnce();
    expect(providerMocks.update.mock.calls[0]?.[0]).toMatchObject({
      variables: {
        settings: {
          profile: { displayName: 'Scheduled name' },
          sections: [{ title: 'Scheduled section' }],
        },
      },
    });
    cleanup();
  });

  it('does not let an in-flight autoSave payload change with later nested mutations', async () => {
    const request = deferred<{ data: { id: number } }>();
    providerMocks.update.mockReturnValue(request.promise);

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 },
    });

    form.setFieldValue('settings', { profile: { displayName: 'Submitted name' } });
    await vi.advanceTimersByTimeAsync(10);

    const submitted = providerMocks.update.mock.calls[0]?.[0] as {
      variables: { settings: { profile: { displayName: string } } };
    };
    (form.values.settings as { profile: { displayName: string } }).profile.displayName = 'Edited in flight';

    expect(submitted.variables.settings.profile.displayName).toBe('Submitted name');

    request.resolve({ data: { id: 1 } });
    await vi.advanceTimersByTimeAsync(0);
    cleanup();
  });

  it('does not schedule follow-up work when an in-flight autoSave resolves after cleanup', async () => {
    const request = deferred<{ data: { id: number } }>();
    providerMocks.update.mockReturnValue(request.promise);

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 },
    });

    form.setFieldValue('title', 'Submitted before cleanup');
    await vi.advanceTimersByTimeAsync(10);
    expect(providerMocks.update).toHaveBeenCalledOnce();

    form.setFieldValue('title', 'Queued while request is in flight');
    cleanup();
    expect(vi.getTimerCount()).toBe(0);

    request.resolve({ data: { id: 1 } });
    await vi.advanceTimersByTimeAsync(0);

    expect(providerMocks.update).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears dirty state when an unchanged nested autoSave snapshot succeeds', async () => {
    providerMocks.update.mockResolvedValue({ data: { id: 1 } });

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 },
    });

    form.setFieldValue('settings', {
      profile: { displayName: 'Saved name' },
      sections: [{ title: 'Saved section' }],
    });
    await vi.advanceTimersByTimeAsync(10);

    expect(form.isDirty).toBe(false);
    expect(form.tainted).toEqual({});
    cleanup();
  });

  it('keeps the persisted nested reset baseline independent from live values', async () => {
    providerMocks.update.mockResolvedValue({ data: { id: 1 } });

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 },
    });

    form.setFieldValue('settings', { profile: { displayName: 'Saved name' } });
    await vi.advanceTimersByTimeAsync(10);

    (form.values.settings as { profile: { displayName: string } }).profile.displayName = 'Changed after save';
    form.reset();
    expect(form.values.settings).toEqual({ profile: { displayName: 'Saved name' } });

    (form.values.settings as { profile: { displayName: string } }).profile.displayName = 'Changed after reset';
    form.reset();
    expect(form.values.settings).toEqual({ profile: { displayName: 'Saved name' } });
    cleanup();
  });

  it('snapshots supported structured values while retaining opaque identities', async () => {
    providerMocks.update.mockResolvedValue({ data: { id: 1 } });

    const publishedAt = new Date('2026-07-11T00:00:00.000Z');
    const file = new File(['file contents'], 'report.txt', { type: 'text/plain' });
    const blob = new Blob(['blob contents'], { type: 'text/plain' });
    const payload = new FormData();
    payload.append('title', 'Scheduled title');
    payload.append('tag', 'first');
    payload.append('tag', 'second');
    payload.append('attachment', file);
    const opaque = new OpaqueFormValue('opaque');
    const callback = () => 'result';
    const metadata = Object.assign(Object.create(null) as Record<string, unknown>, {
      nested: { status: 'scheduled' },
    });
    const cyclic = Object.assign(Object.create(null) as Record<string, unknown>, { status: 'scheduled' });
    cyclic.self = cyclic;

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 },
    });

    form.setValues({ publishedAt, payload, file, blob, opaque, callback, metadata, cyclic });

    publishedAt.setUTCDate(12);
    payload.set('title', 'Mutated title');
    (form.values.metadata as { nested: { status: string } }).nested.status = 'mutated';
    (form.values.cyclic as { status: string }).status = 'mutated';

    await vi.advanceTimersByTimeAsync(10);

    const submitted = providerMocks.update.mock.calls[0]?.[0] as {
      variables: Record<string, unknown>;
    };
    const submittedDate = submitted.variables.publishedAt as Date;
    const submittedPayload = submitted.variables.payload as FormData;
    const submittedMetadata = submitted.variables.metadata as Record<string, unknown>;
    const submittedCycle = submitted.variables.cyclic as Record<string, unknown>;

    expect(submittedDate).not.toBe(publishedAt);
    expect(submittedDate.toISOString()).toBe('2026-07-11T00:00:00.000Z');
    expect(submittedPayload).not.toBe(payload);
    expect(submittedPayload.get('title')).toBe('Scheduled title');
    expect(submittedPayload.getAll('tag')).toEqual(['first', 'second']);
    expect(submittedPayload.get('attachment')).toBe(file);
    expect(Object.getPrototypeOf(submittedMetadata)).toBeNull();
    expect(submittedMetadata).toEqual({ nested: { status: 'scheduled' } });
    expect(submittedCycle.status).toBe('scheduled');
    expect(submittedCycle.self).toBe(submittedCycle);
    expect(submitted.variables.file).toBe(file);
    expect(submitted.variables.blob).toBe(blob);
    expect(submitted.variables.opaque).toBe(opaque);
    expect(submitted.variables.callback).toBe(callback);
    expect(form.tainted).toEqual({
      publishedAt: true,
      payload: true,
      metadata: true,
      cyclic: true,
    });
    cleanup();
  });

  it('preserves plain-object cycles without recursion failures', async () => {
    providerMocks.update.mockResolvedValue({ data: { id: 1 } });
    const cyclic: Record<string, unknown> = { status: 'saved' };
    cyclic.self = cyclic;
    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 },
    });

    form.setFieldValue('cyclic', cyclic);
    await vi.advanceTimersByTimeAsync(10);

    const submitted = providerMocks.update.mock.calls[0]?.[0] as {
      variables: { cyclic: Record<string, unknown> };
    };
    expect(submitted.variables.cyclic).not.toBe(cyclic);
    expect(submitted.variables.cyclic.self).toBe(submitted.variables.cyclic);
    expect(form.isDirty).toBe(false);

    form.reset();
    form.triggerAutoSave();
    await vi.advanceTimersByTimeAsync(10);
    const resetSubmission = providerMocks.update.mock.calls[1]?.[0] as {
      variables: { cyclic: Record<string, unknown> };
    };
    expect(resetSubmission.variables.cyclic.self).toBe(resetSubmission.variables.cyclic);
    cleanup();
  });

  it('reconciles and resets unchanged Date and FormData values structurally', async () => {
    providerMocks.update.mockResolvedValue({ data: { id: 1 } });
    const publishedAt = new Date('2026-07-11T00:00:00.000Z');
    const file = new File(['file contents'], 'report.txt', { type: 'text/plain' });
    const payload = new FormData();
    payload.append('title', 'Saved title');
    payload.append('attachment', file);

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 },
    });

    form.setValues({ publishedAt, payload });
    await vi.advanceTimersByTimeAsync(10);

    expect(form.isDirty).toBe(false);
    (form.values.publishedAt as Date).setUTCDate(12);
    (form.values.payload as FormData).set('title', 'Changed title');
    form.reset();

    const resetDate = form.values.publishedAt as Date;
    const resetPayload = form.values.payload as FormData;
    expect(resetDate).not.toBe(publishedAt);
    expect(resetDate.toISOString()).toBe('2026-07-11T00:00:00.000Z');
    expect(resetPayload).not.toBe(payload);
    expect(resetPayload.get('title')).toBe('Saved title');
    expect(resetPayload.get('attachment')).toBe(file);

    resetDate.setUTCDate(13);
    resetPayload.set('title', 'Changed after reset');
    form.reset();
    expect((form.values.publishedAt as Date).toISOString()).toBe('2026-07-11T00:00:00.000Z');
    expect((form.values.payload as FormData).get('title')).toBe('Saved title');
    cleanup();
  });

  it('ignores an in-flight autoSave completion after switching records', async () => {
    const request = deferred<{ data: { id: number } }>();
    providerMocks.update.mockReturnValue(request.promise);

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 },
    });

    form.setFieldValue('title', 'Record A in-flight value');
    await vi.advanceTimersByTimeAsync(10);
    expect(providerMocks.update).toHaveBeenCalledOnce();

    form.setId(2);
    form.values.title = 'Record B loaded value';

    request.resolve({ data: { id: 1 } });
    await vi.advanceTimersByTimeAsync(0);

    expect(form.id).toBe(2);
    expect(form.values.title).toBe('Record B loaded value');
    expect(form.isDirty).toBe(false);
    expect(form.autoSave).toEqual({ status: 'idle', data: null, error: null });
    expect(providerMocks.invalidateQueries).toHaveBeenCalledOnce();
    const invalidation = providerMocks.invalidateQueries.mock.calls[0]?.[0] as {
      predicate: (query: { queryKey: readonly unknown[] }) => boolean;
    };
    expect(invalidation.predicate({ queryKey: [undefined, 'posts', 'list'] })).toBe(true);
    expect(invalidation.predicate({ queryKey: [undefined, 'users', 'list'] })).toBe(false);
    cleanup();
  });

  it('queues a new record edit while the previous record autoSave is in flight', async () => {
    const request = deferred<{ data: { id: number } }>();
    providerMocks.update
      .mockImplementationOnce(() => request.promise)
      .mockResolvedValue({ data: { id: 2 } });

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 },
    });

    form.setFieldValue('title', 'Record A in-flight value');
    await vi.advanceTimersByTimeAsync(10);
    expect(providerMocks.update).toHaveBeenCalledOnce();

    form.setId(2);
    form.values.id = 2;
    form.setFieldValue('title', 'Record B new edit');

    request.resolve({ data: { id: 1 } });
    await vi.advanceTimersByTimeAsync(10);

    expect(providerMocks.update).toHaveBeenCalledTimes(2);
    expect(providerMocks.update.mock.calls[1]?.[0]).toMatchObject({
      id: 2,
      variables: { id: 2, title: 'Record B new edit' },
    });
    expect(form.isDirty).toBe(false);
    cleanup();
  });

  it('keeps newer values dirty when the queued autoSave fails after an older snapshot succeeds', async () => {
    const requests: Array<ReturnType<typeof deferred<{ data: { id: number } }>>> = [];
    providerMocks.update.mockImplementation(() => {
      const request = deferred<{ data: { id: number } }>();
      requests.push(request);
      return request.promise;
    });

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: { enabled: true, debounce: 10 },
      warnWhenUnsavedChanges: true,
    });

    form.setValues({ title: 'Saved snapshot', body: 'Stable body' });
    await vi.advanceTimersByTimeAsync(10);

    expect(providerMocks.update).toHaveBeenCalledTimes(1);
    form.setFieldValue('title', 'Unsaved latest value');

    requestAt(requests, 0).resolve({ data: { id: 1 } });
    await vi.advanceTimersByTimeAsync(0);

    expect(form.tainted).toEqual({ title: true });
    expect(form.values).toMatchObject({ title: 'Unsaved latest value', body: 'Stable body' });

    await vi.advanceTimersByTimeAsync(10);
    expect(providerMocks.update).toHaveBeenCalledTimes(2);
    expect(providerMocks.update.mock.calls[1]?.[0]).toMatchObject({
      variables: { title: 'Unsaved latest value', body: 'Stable body' },
    });

    requestAt(requests, 1).reject(new Error('latest save failed'));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(2000);
    flushSync();

    expect(form.autoSave.status).toBe('error');
    expect(form.isDirty).toBe(true);
    expect(form.tainted).toEqual({ title: true });
    expect(form.values.title).toBe('Unsaved latest value');

    const unloadEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unloadEvent);
    expect(unloadEvent.defaultPrevented).toBe(true);

    form.reset();
    expect(form.values).toMatchObject({ title: 'Saved snapshot', body: 'Stable body' });
    cleanup();
  });

  it('queues edits made during manual submit and does not redirect for a stale snapshot', async () => {
    const requests: Array<ReturnType<typeof deferred<{ data: { id: number } }>>> = [];
    providerMocks.update.mockImplementation(() => {
      const request = deferred<{ data: { id: number } }>();
      requests.push(request);
      return request.promise;
    });

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      redirect: 'list',
      autoSave: { enabled: true, debounce: 10 },
    });

    form.setValues({ title: 'Submitted snapshot', body: 'Submitted body' });
    const submitPromise = form.submit();
    await vi.advanceTimersByTimeAsync(0);

    expect(providerMocks.update).toHaveBeenCalledTimes(1);
    form.setFieldValue('title', 'Edited during submit');
    requestAt(requests, 0).resolve({ data: { id: 1 } });
    await submitPromise;
    await vi.advanceTimersByTimeAsync(0);

    expect(providerMocks.navigate).not.toHaveBeenCalled();
    expect(form.tainted).toEqual({ title: true });
    expect(form.values).toMatchObject({ title: 'Edited during submit', body: 'Submitted body' });

    await vi.advanceTimersByTimeAsync(10);
    expect(providerMocks.update).toHaveBeenCalledTimes(2);
    expect(providerMocks.update.mock.calls[1]?.[0]).toMatchObject({
      variables: { title: 'Edited during submit', body: 'Submitted body' },
    });

    requestAt(requests, 1).resolve({ data: { id: 1 } });
    await vi.advanceTimersByTimeAsync(0);

    expect(form.isDirty).toBe(false);
    expect(providerMocks.navigate).not.toHaveBeenCalled();
    form.reset();
    expect(form.values).toMatchObject({ title: 'Edited during submit', body: 'Submitted body' });
    cleanup();
  });

  it('deeply snapshots nested values for manual submit and reconciliation', async () => {
    const request = deferred<{ data: { id: number } }>();
    providerMocks.update.mockReturnValue(request.promise);

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      redirect: false,
    });

    form.setFieldValue('settings', { profile: { displayName: 'Submitted name' } });
    const submitPromise = form.submit();
    await vi.advanceTimersByTimeAsync(0);

    const submitted = providerMocks.update.mock.calls[0]?.[0] as {
      variables: { settings: { profile: { displayName: string } } };
    };
    (form.values.settings as { profile: { displayName: string } }).profile.displayName = 'Edited in flight';

    expect(submitted.variables.settings.profile.displayName).toBe('Submitted name');

    request.resolve({ data: { id: 1 } });
    await submitPromise;
    expect(form.values.settings).toEqual({ profile: { displayName: 'Edited in flight' } });
    expect(form.tainted).toEqual({ settings: true });

    form.reset();
    expect(form.values.settings).toEqual({ profile: { displayName: 'Submitted name' } });
    cleanup();
  });

  it('does not reconcile or redirect an in-flight manual submit after switching records', async () => {
    const request = deferred<{ data: { id: number } }>();
    const onMutationSuccess = vi.fn();
    providerMocks.update.mockReturnValue(request.promise);

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      redirect: 'list',
      onMutationSuccess,
    });

    form.setFieldValue('title', 'Record A submitted value');
    const submitPromise = form.submit();
    await vi.advanceTimersByTimeAsync(0);
    expect(providerMocks.update).toHaveBeenCalledOnce();

    form.setId(2);
    form.values.title = 'Record B loaded value';

    request.resolve({ data: { id: 1 } });
    await submitPromise;
    await vi.advanceTimersByTimeAsync(0);

    expect(form.id).toBe(2);
    expect(form.values.title).toBe('Record B loaded value');
    expect(form.isDirty).toBe(false);
    expect(providerMocks.navigate).not.toHaveBeenCalled();
    expect(onMutationSuccess).not.toHaveBeenCalled();
    cleanup();
  });

  it('keeps the existing redirect behavior when the submitted snapshot is still current', async () => {
    providerMocks.update.mockResolvedValue({ data: { id: 1 } });

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      redirect: 'list',
    });

    form.setFieldValue('title', 'Submitted and current');
    await form.submit();

    expect(form.isDirty).toBe(false);
    expect(providerMocks.navigate).toHaveBeenCalledOnce();
    expect(providerMocks.navigate).toHaveBeenCalledWith('/posts');
    form.reset();
    expect(form.values.title).toBe('Submitted and current');
    cleanup();
  });

  it('treats an onFinish-transformed payload as saved when the source values did not change', async () => {
    providerMocks.update.mockResolvedValue({ data: { id: 1 } });

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: {
        enabled: true,
        debounce: 10,
        onFinish: (source) => ({ title: String(source.title).trim() }),
      },
    });

    form.setValues({ title: '  Trimmed title  ', body: 'Omitted from payload' });
    await vi.advanceTimersByTimeAsync(10);

    expect(providerMocks.update).toHaveBeenCalledOnce();
    expect(providerMocks.update.mock.calls[0]?.[0]).toMatchObject({
      variables: { title: 'Trimmed title' },
    });
    expect(providerMocks.update.mock.calls[0]?.[0].variables).not.toHaveProperty('body');
    expect(form.isDirty).toBe(false);

    form.reset();
    expect(form.values).toEqual({ title: 'Trimmed title' });
    cleanup();
  });

  it('keeps a newer edit dirty when an onFinish-transformed snapshot succeeds', async () => {
    const request = deferred<{ data: { id: number } }>();
    providerMocks.update.mockReturnValue(request.promise);

    const { form, cleanup } = mountForm({
      action: 'edit',
      resource: 'posts',
      id: 1,
      autoSave: {
        enabled: true,
        debounce: 10,
        onFinish: (source) => ({ title: String(source.title).trim() }),
      },
    });

    form.setFieldValue('title', '  First snapshot  ');
    await vi.advanceTimersByTimeAsync(10);
    form.setFieldValue('title', 'Newer edit');

    request.resolve({ data: { id: 1 } });
    await vi.advanceTimersByTimeAsync(0);

    expect(form.values.title).toBe('Newer edit');
    expect(form.tainted).toEqual({ title: true });
    expect(form.isDirty).toBe(true);
    form.reset();
    expect(form.values).toEqual({ title: 'First snapshot' });
    cleanup();
  });
});
