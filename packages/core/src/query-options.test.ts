import { describe, expect, test } from 'bun:test';
import { applyListSelect, listQuerySettings } from './query-options';

describe('list query options', () => {
  test('keeps TanStack retry, select, placeholderData, and refetchInterval without dropping disabled flags', () => {
    const placeholder = () => ({ data: [], total: 0 });
    const settings = listQuerySettings<{ data: unknown[]; total: number }>({
      enabled: false,
      retry: 0,
      retryDelay: (failureCount) => failureCount,
      refetchInterval: 5_000,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: 'always',
      placeholderData: placeholder,
      staleTime: 0,
    });
    expect(settings.enabled).toBe(false);
    expect(settings.retry).toBe(0);
    expect(settings.refetchInterval).toBe(5_000);
    expect(settings.refetchIntervalInBackground).toBe(true);
    expect(settings.refetchOnWindowFocus).toBe('always');
    expect(settings.placeholderData).toBe(placeholder);
    expect(settings.staleTime).toBe(0);
    expect(settings.retryDelay?.(2, new Error('x'))).toBe(2);

    const selected = applyListSelect({ data: [{ id: 1 }, { id: 2 }], total: 2 }, (result) => ({
      ...result,
      data: result.data.filter((row) => row.id === 1),
    }));
    expect(selected).toEqual({ data: [{ id: 1 }], total: 2 });
    expect(applyListSelect({ data: [], total: 0 }, undefined)).toEqual({ data: [], total: 0 });
  });
});
