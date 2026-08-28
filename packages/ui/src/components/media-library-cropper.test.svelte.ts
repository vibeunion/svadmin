import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import MediaLibraryModal from './MediaLibraryModal.svelte';
import ImageCropper from './ImageCropper.svelte';

describe('MediaLibraryModal and ImageCropper', () => {
  it('renders MediaLibraryModal with media grid when open', () => {
    const mediaItems = [
      { id: '1', name: 'Header.png', url: '/header.png', category: 'Images' },
    ];

    render(MediaLibraryModal, {
      open: true,
      mediaItems,
    });

    expect(document.body.textContent).toContain('Header.png');
    expect(document.body.textContent).toContain('Media Asset Library');
  });

  it('renders ImageCropper with zoom and rotate controls', () => {
    const view = render(ImageCropper, {
      imageUrl: '/avatar.jpg',
      aspectRatio: 1,
    });

    expect(view.container.textContent).toContain('Image Cropper');
    expect(view.container.textContent).toContain('Rotate');
    expect(view.container.textContent).toContain('Apply Crop');
  });
});
