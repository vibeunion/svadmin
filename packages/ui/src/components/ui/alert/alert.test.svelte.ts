import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Alert from './alert.svelte';
import AlertTitle from './alert-title.svelte';

afterEach(() => cleanup());

const message = (text: string) => createRawSnippet(() => ({ render: () => `<p>${text}</p>` }));

describe('Alert', () => {
  it('renders a dismiss button only when closable', async () => {
    const onclose = vi.fn();
    render(Alert, { closable: true, closeLabel: 'Dismiss notice', onclose, children: message('Saved') });
    await fireEvent.click(screen.getByRole('button', { name: 'Dismiss notice' }));
    expect(onclose).toHaveBeenCalledTimes(1);
    cleanup();

    render(Alert, { children: message('Info') });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps alert title semantics', () => {
    render(AlertTitle, { children: message('Heads up') });
    expect(screen.getByText('Heads up')).toBeTruthy();
  });
});
