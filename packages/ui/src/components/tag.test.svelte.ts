import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Tag from './Tag.svelte';

afterEach(() => cleanup());

const label = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('Tag', () => {
  it('renders a compact label variant', () => {
    const view = render(Tag, { variant: 'outline', size: 'compact', children: label('Northwind') });
    expect(screen.getByText('Northwind')).toBeTruthy();
    expect(view.container.querySelector('[data-slot="tag"]')?.getAttribute('data-size')).toBe('compact');
  });

  it('closes through the labelled close button', async () => {
    const onclose = vi.fn();
    render(Tag, { closable: true, closeLabel: 'Remove Northwind', onclose, children: label('Northwind') });
    await fireEvent.click(screen.getByRole('button', { name: 'Remove Northwind' }));
    expect(onclose).toHaveBeenCalledTimes(1);
  });

  it('toggles checkable state without nesting buttons', async () => {
    const onchange = vi.fn();
    render(Tag, {
      checkable: true,
      checked: false,
      closable: true,
      onchange,
      closeLabel: 'Remove tag',
      children: label('Checked tag'),
    });
    await fireEvent.click(screen.getByRole('button', { pressed: false }));
    expect(onchange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'Remove tag' })).toBeTruthy();
  });

  it('does not fire callbacks while disabled', async () => {
    const onchange = vi.fn();
    const onclose = vi.fn();
    render(Tag, {
      checkable: true,
      closable: true,
      disabled: true,
      onchange,
      onclose,
      children: label('Disabled tag'),
    });
    await fireEvent.click(screen.getByRole('button', { pressed: false }));
    await fireEvent.click(screen.getByRole('button', { name: 'Remove tag' }));
    expect(onchange).not.toHaveBeenCalled();
    expect(onclose).not.toHaveBeenCalled();
  });
});
