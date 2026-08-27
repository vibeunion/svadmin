import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import MediaThumbnail from './MediaThumbnail.svelte';
import ImageField from '../fields/ImageField.svelte';

describe('MediaThumbnail and ImageField components', () => {
  it('moves an image from loading to loaded state', async () => {
    const view = render(MediaThumbnail, {
      src: 'https://example.com/photo.png',
      alt: 'Test photo',
      title: 'Photo title',
    });

    const img = view.container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/photo.png');
    expect(img?.getAttribute('alt')).toBe('Test photo');
    const thumbnail = view.container.querySelector('[data-slot="media-thumbnail"]');
    expect(thumbnail?.getAttribute('data-media-state')).toBe('loading');
    if (!img) throw new Error('Expected an image thumbnail');
    await fireEvent.load(img);
    expect(thumbnail?.getAttribute('data-media-state')).toBe('loaded');
  });

  it('triggers onopen from a native button', async () => {
    const onopen = vi.fn();
    const view = render(MediaThumbnail, {
      src: 'https://example.com/sample.jpg',
      alt: 'Sample',
      onopen,
    });

    const img = view.container.querySelector('img');
    if (!img) throw new Error('Expected an interactive image thumbnail');
    await fireEvent.load(img);
    const trigger = view.container.querySelector('button');
    expect(trigger).not.toBeNull();
    if (!trigger) throw new Error('Expected an interactive thumbnail trigger');

    await fireEvent.click(trigger);
    expect(onopen).toHaveBeenCalledTimes(1);
    expect(trigger.getAttribute('type')).toBe('button');
  });

  it('does not expose open behavior when the overlay is disabled', async () => {
    const onopen = vi.fn();
    const view = render(MediaThumbnail, {
      src: 'https://example.com/non-previewable.jpg',
      showOverlay: false,
      onopen,
    });

    const thumbnail = view.container.querySelector('[data-slot="media-thumbnail"]');
    expect(thumbnail).not.toBeNull();
    if (!thumbnail) throw new Error('Expected a thumbnail container');

    expect(thumbnail.getAttribute('role')).toBeNull();
    expect(thumbnail.getAttribute('tabindex')).toBeNull();
    await fireEvent.click(thumbnail);
    expect(onopen).not.toHaveBeenCalled();
  });

  it('shows a semantic error fallback and does not expose preview', async () => {
    const view = render(MediaThumbnail, {
      src: 'https://example.com/missing.png',
      errorLabel: 'Unavailable evidence',
    });
    const img = view.container.querySelector('img');
    if (!img) throw new Error('Expected a loading image thumbnail');
    await fireEvent.error(img);

    expect(view.container.querySelector('[data-media-state="error"]')).not.toBeNull();
    expect(screen.getByText('Unavailable evidence')).toBeTruthy();
    expect(view.container.querySelector('button')).toBeNull();
  });

  it('opens and closes the built-in image preview', async () => {
    const view = render(MediaThumbnail, { src: 'https://example.com/evidence.jpg', alt: 'Evidence' });
    const img = view.container.querySelector('img');
    if (!img) throw new Error('Expected a previewable image thumbnail');
    await fireEvent.load(img);
    await fireEvent.click(screen.getByRole('button', { name: 'Preview Evidence' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('renders document fallback when non-image mimeType or fileName is passed', () => {
    const view = render(MediaThumbnail, {
      src: 'https://example.com/doc.pdf',
      fileName: 'report-analysis.pdf',
      mimeType: 'application/pdf',
    });

    expect(view.container.querySelector('img')).toBeNull();
    const docSlot = view.container.querySelector('[data-slot="media-thumbnail-document"]');
    expect(docSlot).not.toBeNull();
    expect(docSlot?.textContent).toContain('report-analysis.pdf');
  });

  it('renders a semantic empty state without a media shell', () => {
    const view = render(MediaThumbnail, { emptyLabel: 'No evidence' });
    expect(view.container.textContent?.trim()).toBe('No evidence');
    expect(view.container.querySelector('[data-media-state="empty"]')).not.toBeNull();
    expect(view.container.querySelector('[data-slot="media-thumbnail"]')).toBeNull();
  });

  it('renders ImageField with enhanced MediaThumbnail and fallback', () => {
    const populated = render(ImageField, {
      value: 'https://example.com/avatar.webp',
      alt: 'User avatar',
      width: 64,
      height: 64,
    });
    expect(populated.container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/avatar.webp');
    populated.unmount();

    const empty = render(ImageField, { value: null });
    expect(empty.container.textContent?.trim()).toBe('No image');
  });
});
