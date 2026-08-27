import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import LiteMediaThumbnail from './LiteMediaThumbnail.svelte';

describe('LiteMediaThumbnail', () => {
  it('renders semantic empty, loaded, and error states', async () => {
    const empty = render(LiteMediaThumbnail, { src: null, emptyLabel: 'No evidence' });
    expect(empty.container.querySelector('[data-lite-media-state="empty"]')?.textContent).toBe('No evidence');
    empty.unmount();

    const loaded = render(LiteMediaThumbnail, { src: '/evidence.png', alt: 'Evidence' });
    const loadedImage = loaded.container.querySelector('img');
    if (!loadedImage) throw new Error('Expected a lite image');
    await fireEvent.load(loadedImage);
    expect(loaded.container.querySelector('[data-lite-media-state="loaded"]')).not.toBeNull();
    loaded.unmount();

    const failed = render(LiteMediaThumbnail, { src: '/missing.png', errorLabel: 'Unavailable' });
    const failedImage = failed.container.querySelector('img');
    if (!failedImage) throw new Error('Expected a failing lite image');
    await fireEvent.error(failedImage);
    expect(failed.container.querySelector('[data-lite-media-state="error"]')?.textContent).toContain('Unavailable');
  });
});
