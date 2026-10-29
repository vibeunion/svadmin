import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TypographyText from './TypographyText.svelte';

afterEach(() => cleanup());

describe('TypographyText', () => {
  it('renders emphasis and semantic types', () => {
    const view = render(TypographyText, {
      text: 'Important',
      strong: true,
      underline: true,
      mark: true,
      type: 'danger',
    });
    const root = view.container.querySelector('.svadmin-typography-text');
    expect(root?.getAttribute('data-type')).toBe('danger');
    expect(root?.classList.contains('is-strong')).toBe(true);
    expect(root?.classList.contains('is-underline')).toBe(true);
    expect(root?.classList.contains('is-mark')).toBe(true);
    expect(view.getByText('Important')).toBeTruthy();
  });

  it('edits inline text and reports changes', async () => {
    const onchange = vi.fn();
    const view = render(TypographyText, { text: 'Old', editable: true, onchange });
    await fireEvent.click(view.getByRole('button', { name: 'Edit text' }));
    const input = view.container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Old');
    await fireEvent.input(input, { target: { value: 'New' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(onchange).toHaveBeenCalledWith('New');
    expect(view.getByText('New')).toBeTruthy();
  });

  it('cancels editing with Escape', async () => {
    const view = render(TypographyText, { text: 'Stable', editable: true });
    await fireEvent.click(view.getByRole('button', { name: 'Edit text' }));
    const input = view.container.querySelector('input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Changed' } });
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect(view.getByText('Stable')).toBeTruthy();
  });
});
