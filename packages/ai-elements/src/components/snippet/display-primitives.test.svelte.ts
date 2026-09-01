import { createRawSnippet } from 'svelte';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Checkpoint from '../checkpoint/Checkpoint.svelte';
import CheckpointIcon from '../checkpoint/CheckpointIcon.svelte';
import CheckpointTrigger from '../checkpoint/CheckpointTrigger.svelte';
import Image from '../image/Image.svelte';
import Shimmer from '../shimmer/Shimmer.svelte';
import Suggestion from '../suggestion/Suggestion.svelte';
import SnippetHost from './Snippet.test-host.svelte';

describe('display primitives', () => {
  it('renders generated image bytes as a data URL', () => {
    const { getByRole } = render(Image, {
      mediaType: 'image/png',
      uint8Array: new Uint8Array([72, 105]),
      alt: 'Generated preview',
    });

    expect(getByRole('img', { name: 'Generated preview' }).getAttribute('src')).toBe('data:image/png;base64,SGk=');
  });

  it('supports semantic shimmer elements and suggestion callbacks', async () => {
    const shimmer = render(Shimmer, { as: 'h2', text: 'Generating response', duration: 3 });
    expect(shimmer.container.querySelector('h2')?.textContent).toBe('Generating response');
    expect(shimmer.container.querySelector('h2')?.getAttribute('style')).toContain('3s');
    shimmer.unmount();

    const onclick = vi.fn();
    const suggestion = render(Suggestion, { suggestion: 'Summarize this', onclick });
    await fireEvent.click(suggestion.getByRole('button', { name: 'Summarize this' }));
    expect(onclick).toHaveBeenCalledWith('Summarize this');
  });

  it('composes checkpoint parts with a restore action and separator', async () => {
    const restore = vi.fn();
    const children = createRawSnippet(() => ({ render: () => '<span>Saved state</span>' }));
    const checkpoint = render(Checkpoint, { children });
    expect(checkpoint.getByText('Saved state')).not.toBeNull();
    expect(checkpoint.container.querySelector('.svadmin-ai-checkpoint__separator')).not.toBeNull();
    checkpoint.unmount();

    const icon = render(CheckpointIcon);
    expect(icon.container.querySelector('svg')).not.toBeNull();
    icon.unmount();

    const triggerChildren = createRawSnippet(() => ({ render: () => 'Restore checkpoint' }));
    const trigger = render(CheckpointTrigger, { tooltip: 'Restore this state', onclick: restore, children: triggerChildren });
    const button = trigger.getByRole('button', { name: 'Restore checkpoint' });
    expect(button.getAttribute('title')).toBe('Restore this state');
    await fireEvent.click(button);
    expect(restore).toHaveBeenCalledOnce();
  });

  it('shares snippet code with its input and copy button', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const oncopy = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const snippet = render(SnippetHost, { code: 'bun add @svadmin/ai-elements', oncopy });

    expect((snippet.getByRole('textbox', { name: 'Code snippet' }) as HTMLInputElement).value).toBe('bun add @svadmin/ai-elements');
    await fireEvent.click(snippet.getByRole('button', { name: 'Copy' }));

    expect(writeText).toHaveBeenCalledWith('bun add @svadmin/ai-elements');
    expect(oncopy).toHaveBeenCalledOnce();
    expect(snippet.getByRole('button', { name: 'Copied' })).not.toBeNull();
    await waitFor(() => expect(snippet.getByRole('button', { name: 'Copy' })).not.toBeNull());
  });
});
