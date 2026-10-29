import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TypographyEllipsis from './TypographyEllipsis.svelte';

afterEach(() => cleanup());

const content = createRawSnippet(() => ({
  render: () => '<p>Long body that should be clamped to the configured row count.</p>',
}));

describe('TypographyEllipsis', () => {
  it('clamps to the configured rows and exposes the row count', () => {
    const view = render(TypographyEllipsis, {
      props: { rows: 2, expandable: true, expanded: true, expandText: 'More', collapseText: 'Less', children: content },
    });

    const root = view.container.querySelector('.svadmin-typography-ellipsis') as HTMLElement | null;
    expect(root?.style.getPropertyValue('--svadmin-ellipsis-rows')).toBe('2');
    expect(root?.getAttribute('data-expanded')).toBe('true');
  });

  it('toggles expanded state through the expandable control', async () => {
    const scrollHeight = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(100);
    const clientHeight = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(20);
    try {
      const onExpand = vi.fn();
      const view = render(TypographyEllipsis, {
        props: { rows: 2, expandable: true, expanded: false, expandText: 'More', collapseText: 'Less', onExpand, children: content },
      });

      const button = await view.findByRole('button', { name: 'More' });
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(view.container.querySelector('.svadmin-typography-ellipsis__content')?.classList.contains('is-clamped')).toBe(true);

      await fireEvent.click(button);
      expect(onExpand).toHaveBeenCalledWith(true);
      expect(view.getByRole('button', { name: 'Less' }).getAttribute('aria-expanded')).toBe('true');
      expect(view.container.querySelector('.svadmin-typography-ellipsis__content')?.classList.contains('is-clamped')).toBe(false);
    } finally {
      scrollHeight.mockRestore();
      clientHeight.mockRestore();
    }
  });

  it('hides the control when expandable is off', () => {
    const view = render(TypographyEllipsis, { props: { expanded: true, children: content } });
    expect(view.queryByRole('button')).toBeNull();
  });
});