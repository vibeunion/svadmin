import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import MediaThumbnail from './MediaThumbnail.svelte';
import ImageField from '../fields/ImageField.svelte';

describe('MediaThumbnail and ImageField components', () => {
  it('renders image thumbnail with valid src and alt', () => {
    const view = render(MediaThumbnail, {
      src: 'https://example.com/photo.png',
      alt: 'Test photo',
      title: 'Photo title',
    });

    const img = view.container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/photo.png');
    expect(img?.getAttribute('alt')).toBe('Test photo');
    expect(view.container.querySelector('[data-slot="media-thumbnail"]')).not.toBeNull();
  });

  it('triggers onopen when clicked or Enter key is pressed', async () => {
    const onopen = vi.fn();
    const view = render(MediaThumbnail, {
      src: 'https://example.com/sample.jpg',
      alt: 'Sample',
      onopen,
    });

    const trigger = view.container.querySelector('[role="button"]');
    expect(trigger).not.toBeNull();

    await fireEvent.click(trigger!);
    expect(onopen).toHaveBeenCalledTimes(1);

    await fireEvent.keyDown(trigger!, { key: 'Enter' });
    expect(onopen).toHaveBeenCalledTimes(2);
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

  it('renders empty placeholder when no src or fileName is provided', () => {
    const view = render(MediaThumbnail, {});
    expect(view.container.textContent?.trim()).toBe('—');
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
    expect(empty.container.textContent?.trim()).toBe('—');
  });
});
