import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Rate from './Rate.svelte';

afterEach(() => cleanup());

describe('Rate', () => {
  it('exposes discrete radio semantics and supports clear', async () => {
    const onchange = vi.fn();
    const view = render(Rate, { value: 3, name: 'score', ariaLabel: 'Score', onchange });
    const radios = view.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    expect(radios[2]?.getAttribute('aria-checked')).toBe('true');
    await fireEvent.click(radios[2]!);
    expect(onchange).toHaveBeenLastCalledWith(0);
  });

  it('moves rating with keyboard and respects disabled state', async () => {
    const onchange = vi.fn();
    const view = render(Rate, { value: 2, disabled: false, onchange });
    await fireEvent.keyDown(view.getAllByRole('radio')[1]!, { key: 'ArrowRight' });
    expect(onchange).toHaveBeenLastCalledWith(3);
    const disabled = render(Rate, { value: 2, disabled: true, onchange });
    expect([...disabled.container.querySelectorAll('button')].every(button => (
      (button as HTMLButtonElement).disabled
    ))).toBe(true);
  });
});
