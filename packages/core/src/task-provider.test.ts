import { describe, expect, mock, test } from 'bun:test';
import { withValidatedTaskProvider, type TaskTransport } from './task-provider';

function fixture(overrides: Partial<TaskTransport> = {}) {
  return withValidatedTaskProvider({
    submit: async () => ({ id: 'task-1', wait: async () => ({ id: 'task-1' }) }),
    get: async id => ({ id }),
    ...overrides,
  });
}

describe('validated task providers', () => {
  test('rejects malformed configuration and sanitizes throwing accessors', () => {
    for (const transport of [
      null, 1, {}, { submit: async () => null, get: 1 },
      { submit: async () => null, get: async () => null, cancel: true },
      { get submit() { throw new Error('secret config'); } },
    ]) {
      expect(() => Reflect.apply(withValidatedTaskProvider, undefined, [transport]))
        .toThrow('Invalid task input.');
    }
  });

  test('captures methods and preserves class method receivers', async () => {
    class Transport {
      prefix = 'task';
      async submit() { return { id: this.prefix, wait: async () => ({ id: this.prefix }) }; }
      async get(id: string) { return { id, name: this.prefix }; }
    }
    const transport = new Transport();
    const provider = withValidatedTaskProvider(transport);
    transport.get = async id => ({ id, name: 'replaced' });
    await expect(provider.get('task')).resolves.toEqual({ id: 'task', name: 'task' });
    expect((await provider.submit('function')).id).toBe('task');
  });

  test('preserves identity and does not invent optional capabilities', () => {
    const transport = { submit: async () => null, get: async () => null };
    const provider = withValidatedTaskProvider(transport);
    expect(withValidatedTaskProvider(transport)).toBe(provider);
    expect(withValidatedTaskProvider(provider)).toBe(provider);
    expect(provider.list).toBeUndefined();
    expect(provider.subscribe).toBeUndefined();
  });

  test('rejects malformed handles before advertising accepted submission', async () => {
    for (const value of [
      undefined, {}, { wait: async () => ({ id: 'task' }) },
      { id: 'task', wait: 1 }, { id: 'task', wait: async () => ({ id: 'task' }), cancel: undefined },
    ]) {
      await expect(fixture({ submit: async () => value }).submit('function'))
        .rejects.toMatchObject({ code: 'INVALID_TASK_RESPONSE', writeMayHaveSucceeded: true });
    }
  });

  test('validates handle operations and their expected IDs', async () => {
    const provider = fixture({ submit: async () => ({
      id: 'task-1', wait: async () => ({ id: 'other' }),
      cancel: async () => null, retry: async () => ({ id: 'other' }),
    }) });
    const handle = await provider.submit('function');
    await expect(handle.wait()).rejects.toMatchObject({ code: 'INVALID_TASK_RESPONSE', writeMayHaveSucceeded: false });
    await expect(handle.cancel?.()).rejects.toMatchObject({ code: 'INVALID_TASK_RESPONSE', writeMayHaveSucceeded: true });
    await expect(handle.retry?.()).rejects.toMatchObject({ code: 'INVALID_TASK_RESPONSE', writeMayHaveSucceeded: true });
  });

  test('requires a matching record from cancellation and retries', async () => {
    for (const value of [undefined, { id: 'other' }]) {
      const provider = fixture({ cancel: async () => value, retry: async () => value });
      await expect(provider.cancel?.('task-1')).rejects.toMatchObject({ code: 'INVALID_TASK_RESPONSE', writeMayHaveSucceeded: true });
      await expect(provider.retry?.('task-1')).rejects.toMatchObject({ code: 'INVALID_TASK_RESPONSE', writeMayHaveSucceeded: true });
    }
  });

  test('rejects input before dispatch and snapshots query parameters', async () => {
    const get = mock(async () => null);
    const list = mock(async (params?: Record<string, unknown>) => {
      if (params) params['scope'] = 'changed';
      return { data: [] };
    });
    const provider = fixture({ get, list });
    await expect(provider.get(' ')).rejects.toMatchObject({ code: 'INVALID_TASK_INPUT' });
    expect(get).not.toHaveBeenCalled();
    const params = { scope: 'original' };
    await provider.list?.(params);
    expect(params.scope).toBe('original');
    await expect(provider.list?.({ secret: undefined })).rejects.toMatchObject({ code: 'INVALID_TASK_INPUT' });
    expect(list).toHaveBeenCalledTimes(1);
  });
});
