import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import CanvasAnnotation from './CanvasAnnotation.svelte';
import SignaturePad from './SignaturePad.svelte';

describe('CanvasAnnotation and SignaturePad Components', () => {
  it('renders CanvasAnnotation with toolbar buttons and canvas element', () => {
    const view = render(CanvasAnnotation, {
      width: 600,
      height: 400,
      imageUrl: '/diagram.png',
    });

    expect(view.container.querySelector('canvas')).not.toBeNull();
    expect(view.container.textContent).toContain('Export');
    expect(view.container.textContent).toContain('Undo');
  });

  it('renders SignaturePad with clear and undo controls', () => {
    const view = render(SignaturePad, {
      width: 400,
      height: 150,
    });

    expect(view.container.textContent).toContain('Electronic Signature');
    expect(view.container.textContent).toContain('Undo');
    expect(view.container.textContent).toContain('Clear');
    expect(view.container.querySelector('canvas')).not.toBeNull();
  });
});
