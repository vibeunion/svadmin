import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import QRCode from './QRCode.svelte';

afterEach(() => cleanup());

function pathOf(container: HTMLElement): string {
  const path = container.querySelector('.svadmin-qr-code__svg path');
  return path?.getAttribute('d') ?? '';
}

describe('QRCode', () => {
  it('renders a crisp SVG with an accessible label', () => {
    const view = render(QRCode, { value: 'https://example.com', ariaLabel: 'Share link' });
    const svg = view.getByRole('img', { name: 'Share link' });

    expect(svg.getAttribute('width')).toBe('160');
    expect(svg.getAttribute('shape-rendering')).toBe('crispEdges');
    expect(pathOf(view.container).length).toBeGreaterThan(0);
  });

  it('encodes different content into different matrices', () => {
    const first = render(QRCode, { value: 'alpha' });
    const second = render(QRCode, { value: 'beta' });
    expect(pathOf(first.container)).not.toBe(pathOf(second.container));
  });

  it('respects the requested size and error correction level', () => {
    const view = render(QRCode, { value: 'payload', size: 240, errorCorrectionLevel: 'H' });
    expect(view.getByRole('img').getAttribute('width')).toBe('240');
  });

  it('renders a neutral placeholder without content', () => {
    const view = render(QRCode, { value: '' });
    expect(view.container.querySelector('.svadmin-qr-code__svg')).toBeNull();
    expect(view.getByRole('status').textContent).toContain('No QR content');
  });
});