import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import LiteImage from './LiteImage.svelte';
import LiteQRCode from './LiteQRCode.svelte';

afterEach(() => cleanup());

describe('Lite image primitive', () => {
  it('renders a lazy image with alt text and object-fit', () => {
    const view = render(LiteImage, { src: '/cover.png', alt: 'Quarterly report', fit: 'contain' });

    const image = view.getByRole('img', { name: 'Quarterly report' }) as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('/cover.png');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('decoding')).toBe('async');
    expect(image.getAttribute('style')).toMatch(/object-fit:\s*contain/);
  });

  it('wraps a linked image with an accessible open action', () => {
    const view = render(LiteImage, { src: '/cover.png', alt: 'Cover', href: '/full/cover.png' });

    const link = view.getByRole('link', { name: 'Open Cover' });
    expect(link.getAttribute('href')).toBe('/full/cover.png');
    expect(link.querySelector('img')?.getAttribute('src')).toBe('/cover.png');
  });

  it('falls back to a labelled placeholder without an image source', () => {
    const view = render(LiteImage, { fallback: 'Preview unavailable' });

    const placeholder = view.getByRole('img', { name: 'Preview unavailable' });
    expect(placeholder.tagName).toBe('SPAN');
    expect(placeholder.textContent).toBe('Preview unavailable');
    expect(view.container.querySelector('img')).toBeNull();
  });

  it('applies fixed sizing, rounded corners and a caption', () => {
    const view = render(LiteImage, {
      src: '/avatar.png',
      alt: 'Avatar',
      width: 64,
      height: '48px',
      rounded: true,
      caption: 'Uploaded yesterday',
    });

    const figure = view.container.querySelector('figure.lite-image');
    expect(figure?.className).toContain('lite-image-rounded');
    expect(figure?.getAttribute('style')).toMatch(/width:\s*64px/);
    expect(figure?.getAttribute('style')).toMatch(/height:\s*48px/);
    expect(view.getByText('Uploaded yesterday').tagName).toBe('FIGCAPTION');
  });
});

describe('Lite QR code primitive', () => {
  it('encodes the value into an inline SVG with an accessible name', () => {
    const view = render(LiteQRCode, { value: 'https://example.com/order/42', ariaLabel: 'Order QR code' });

    const svg = view.getByRole('img', { name: 'Order QR code' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('width')).toBe('160');
    expect(svg.getAttribute('height')).toBe('160');
    expect(svg.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/);
    const path = svg.querySelector('path');
    expect(path?.getAttribute('d')?.startsWith('M')).toBe(true);
    // The background rectangle keeps the code scannable on dark canvases.
    expect(svg.querySelector('rect')?.getAttribute('fill')).toBe('#FFFFFF');
  });

  it('honours size, margin, colours and error-correction level', () => {
    const small = render(LiteQRCode, { value: 'ABC', size: 96, margin: 0, color: '#111827', background: '#F9FAFB' });
    const svg = small.container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('96');
    expect(svg?.querySelector('rect')?.getAttribute('fill')).toBe('#F9FAFB');
    expect(svg?.querySelector('path')?.getAttribute('fill')).toBe('#111827');

    const dense = render(LiteQRCode, { value: 'A'.repeat(80), errorCorrectionLevel: 'H', margin: 2 });
    const densePath = dense.container.querySelector('path')?.getAttribute('d') ?? '';
    const smallPath = svg?.querySelector('path')?.getAttribute('d') ?? '';
    expect(densePath.length).toBeGreaterThan(smallPath.length);
    // A larger margin grows the viewBox without changing the encoded modules.
    expect(dense.container.querySelector('svg')?.getAttribute('viewBox')).not.toBe(
      small.container.querySelector('svg')?.getAttribute('viewBox'),
    );
  });

  it('degrades to a status message without a value', () => {
    const view = render(LiteQRCode, { value: '' });

    expect(view.queryByRole('img')).toBeNull();
    const status = view.getByRole('status');
    expect(status.textContent).toBe('No QR content.');
  });
});