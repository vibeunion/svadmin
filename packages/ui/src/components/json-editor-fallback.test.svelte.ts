import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import JsonEditor from './JsonEditor.svelte';
import { requireValue } from '../../../../scripts/test-assertions';

vi.mock('svelte-jsoneditor', () => {
  throw new Error('module unavailable');
});

function stateOf(container: HTMLElement): string | null {
  return container.querySelector('[data-slot="json-editor"]')?.getAttribute('data-state') ?? null;
}

afterEach(() => cleanup());

describe('JsonEditor without the ecosystem package', () => {
  it('validates JSON in the fallback and reports errors', async () => {
    const onchange = vi.fn();
    const onerror = vi.fn();
    const view = render(JsonEditor, { value: { a: 1 }, ariaLabel: 'Payload', onchange, onerror });

    await waitFor(() => expect(stateOf(view.container)).toBe('unavailable'));

    const field = requireValue(view.getByRole('textbox', { name: 'Payload' })) as HTMLTextAreaElement;
    expect(field.value).toContain('"a": 1');

    await fireEvent.input(field, { target: { value: '{"a":2}' } });
    expect(onchange).toHaveBeenLastCalledWith({ a: 2 });

    await fireEvent.input(field, { target: { value: '{bad' } });
    await waitFor(() => expect(view.getByRole('alert')).not.toBeNull());
    expect(onerror).toHaveBeenCalled();
    expect(field.getAttribute('aria-invalid')).toBe('true');

    expect(view.getByRole('status').textContent).toContain('svelte-jsoneditor');
  });
});