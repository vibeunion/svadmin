import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Image from './Image.svelte';

describe('Image', () => {
  it('renders an image with caption and preview affordance', () => {
    const view = render(Image, {
      src: 'https://cdn.example.com/cover.jpg',
      alt: 'Cover',
      width: 320,
      rounded: true,
      preview: true,
    });
    expect(view.getByRole('img', { name: 'Cover' }).getAttribute('src')).toBe('https://cdn.example.com/cover.jpg');
    expect(view.container.querySelector('.svadmin-image')?.classList.contains('is-rounded')).toBe(true);
    expect(view.container.querySelector('.svadmin-image')?.classList.contains('is-preview')).toBe(true);
  });

  it('falls back when the source fails', async () => {
    const view = render(Image, { src: 'https://cdn.example.com/missing.jpg', alt: 'Missing', fallback: 'No preview' });
    await fireEvent.error(view.container.querySelector('img') as HTMLImageElement);
    expect(view.getByRole('img', { name: 'No preview' })).toBeTruthy();
    expect(view.queryByAltText('Missing')).toBeNull();
  });
});
