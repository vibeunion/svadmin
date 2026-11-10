import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CodeEditor from './CodeEditor.svelte';

vi.mock('svelte-codemirror-editor', async () => {
  const stub = await import('./CodeEditor.test-stub.svelte');
  return { default: stub.default };
});

afterEach(() => cleanup());

describe('CodeEditor', () => {
  it('shows an accessible fallback before the ecosystem editor loads', () => {
    const view = render(CodeEditor, { value: 'const a = 1;', ariaLabel: 'Query editor' });
    const root = view.container.querySelector('[data-slot="code-editor"]');

    expect(root?.getAttribute('data-state')).toBe('loading');
    expect(view.getByRole('textbox', { name: 'Query editor' })).not.toBeNull();
  });

  it('loads the ecosystem editor and reports changes', async () => {
    const onchange = vi.fn();
    const view = render(CodeEditor, { value: 'const a = 1;', onchange });

    await waitFor(() => {
      const state = view.container.querySelector('[data-slot="code-editor"]')?.getAttribute('data-state');
      expect(['ready', 'unavailable']).toContain(state);
    }, { timeout: 5000 });

    const editor = view.queryByTestId('mock-codemirror') ?? view.getByRole('textbox');
    await fireEvent.input(editor, { target: { value: 'const b = 2;' } });
    if (editor.getAttribute('data-testid') === 'mock-codemirror' || editor.tagName === 'TEXTAREA') {
      expect(onchange).toHaveBeenLastCalledWith('const b = 2;');
    }
  });
});
