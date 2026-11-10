import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SignaturePad from './SignaturePad.svelte';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mocksignature');
});

describe('SignaturePad Component', () => {
  it('renders canvas element and action buttons', () => {
    const { container } = render(SignaturePad, {
      props: {
        width: 400,
        height: 180,
      },
    });

    const root = container.querySelector('[data-svadmin-component="SignaturePad"]');
    expect(root).not.toBeNull();

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('width')).toBe('400');
    expect(canvas?.getAttribute('height')).toBe('180');

    expect(container.textContent).toContain('Electronic Signature');
    expect(container.textContent).toContain('Undo');
    expect(container.textContent).toContain('Clear');
  });

  it('triggers onsave when confirm button is clicked', async () => {
    const onsaveMock = vi.fn();
    const { container } = render(SignaturePad, {
      props: {
        onsave: onsaveMock,
      },
    });

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();

    if (!canvas) throw new Error('canvas not found');

    // Simulate drawing
    await fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    await fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 });
    await fireEvent.mouseUp(canvas);

    // Look for confirm button
    const confirmBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Confirm')
    );
    expect(confirmBtn).toBeDefined();

    if (confirmBtn) {
      await fireEvent.click(confirmBtn);
      expect(onsaveMock).toHaveBeenCalledWith('data:image/png;base64,mocksignature');
    }
  });

  it('clears signature board and resets value', async () => {
    const onchangeMock = vi.fn();
    const { container } = render(SignaturePad, {
      props: {
        onchange: onchangeMock,
      },
    });

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    await fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    await fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 });
    await fireEvent.mouseUp(canvas);

    const clearBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Clear')
    );
    expect(clearBtn).toBeDefined();

    if (clearBtn) {
      await fireEvent.click(clearBtn);
      expect(onchangeMock).toHaveBeenLastCalledWith('');
    }
  });
});
