import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CodeEditor from './CodeEditor.svelte';

vi.mock('svelte-codemirror-editor', () => {
  throw new Error('module unavailable');
});

afterEach(() => cleanup());

describe('CodeEditor without the ecosystem package', () => {
  it('keeps working with the textarea fallback and shows an install hint', async () => {
    const view = render(CodeEditor, { value: 'const a = 1;', ariaLabel: 'Query editor' });

    await waitFor(() => {
      expect(view.container.querySelector('[data-slot="code-editor"]')?.getAttribute('data-state')).toBe('unavailable');
    });

    expect(view.getByRole('textbox', { name: 'Query editor' })).not.toBeNull();
    expect(view.getByRole('status').textContent).toContain('svelte-codemirror-editor');
  });
});