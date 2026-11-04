import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import JsonEditor from './JsonEditor.svelte';
import { requireValue } from '../../../../scripts/test-assertions';

vi.mock('svelte-jsoneditor', async () => {
  const stub = await import('./JsonEditor.test-stub.svelte');
  return { JSONEditor: stub.default };
});

function stateOf(container: HTMLElement): string | null {
  return container.querySelector('[data-slot="json-editor"]')?.getAttribute('data-state') ?? null;
}

afterEach(() => cleanup());

describe('JsonEditor', () => {
  it('shows an accessible fallback before the structured editor loads', () => {
    const view = render(JsonEditor, { value: { a: 1 }, ariaLabel: 'Payload' });

    expect(stateOf(view.container)).toBe('loading');
    expect(view.getByRole('textbox', { name: 'Payload' })).not.toBeNull();
  });

  // 动态 import 的 mock 在并行负载下偶发被真实模块抢跑；重试而不是放宽断言。
  it('loads the structured editor and reports parsed changes', { retry: 2 }, async () => {
    const onchange = vi.fn();
    const view = render(JsonEditor, { value: { a: 1 }, onchange });

    await waitFor(() => expect(stateOf(view.container)).toBe('ready'), { timeout: 5000 });

    const editor = requireValue(view.getByTestId('mock-jsoneditor'));
    await fireEvent.input(editor, { target: { value: '{"a":2}' } });
    expect(onchange).toHaveBeenLastCalledWith({ a: 2 });
  });
});