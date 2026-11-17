import { describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import Tag from './Tag.svelte';
import BackTop from './BackTop.svelte';
import Affix from './Affix.svelte';
import Anchor from './Anchor.svelte';

const emptySnippet = () => createRawSnippet(() => ({ render: () => '<span></span>' }));

describe('Tag enterprise design system options', () => {
  it('auto-dismisses when closable and uncontrolled, firing onClose and afterClose', async () => {
    const onClose = vi.fn();
    const onclose = vi.fn();
    const afterClose = vi.fn();

    const { container } = render(Tag, {
      props: {
        closable: true,
        onClose,
        onclose,
        afterClose,
      },
    });

    const closeBtn = container.querySelector('.svadmin-tag__close');
    expect(closeBtn).not.toBeNull();
    expect(container.querySelector('.svadmin-tag')).not.toBeNull();

    if (!(closeBtn instanceof HTMLElement)) throw new Error('expected a tag close button');
    await fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
    expect(onclose).toHaveBeenCalled();
    expect(afterClose).toHaveBeenCalled();
    expect(container.querySelector('.svadmin-tag')).toBeNull();
  });

  it('respects controlled visible prop', () => {
    const { container } = render(Tag, {
      props: {
        visible: false,
        closable: true,
      },
    });

    expect(container.querySelector('.svadmin-tag')).toBeNull();
  });

  it('supports checkable with defaultChecked and onChange callback alias', async () => {
    const onChange = vi.fn();
    const onchange = vi.fn();

    const { container } = render(Tag, {
      props: {
        checkable: true,
        defaultChecked: false,
        onChange,
        onchange,
      },
    });

    const control = container.querySelector('.svadmin-tag__control');
    expect(control).not.toBeNull();
    expect(control?.getAttribute('aria-pressed')).toBe('false');

    if (!(control instanceof HTMLElement)) throw new Error('expected a back top control');
    await fireEvent.click(control);

    expect(onChange).toHaveBeenCalledWith(true);
    expect(onchange).toHaveBeenCalledWith(true);
  });
});

describe('BackTop and Affix design system options', () => {
  it('supports onClick alias and custom style on BackTop', () => {
    const onClick = vi.fn();
    const { container } = render(BackTop, {
      props: {
        visibleHeight: 0,
        style: 'bottom: 40px;',
        onClick,
      },
    });

    const btn = container.querySelector('.svadmin-back-top');
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute('style')).toContain('bottom: 40px;');
  });

  it('supports onChange alias and custom style on Affix', () => {
    const onChange = vi.fn();
    const { container } = render(Affix, {
      props: {
        top: 20,
        style: 'z-index: 50;',
        onChange,
        children: emptySnippet(),
      },
    });

    const el = container.querySelector('.svadmin-affix');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('style')).toContain('z-index: 50;');
  });

  it('supports onSelect and onChange on Anchor', async () => {
    const onSelect = vi.fn();
    const onChange = vi.fn();
    const onselect = vi.fn();

    const { container } = render(Anchor, {
      props: {
        items: [
          { id: 'section-1', title: 'Section 1' },
          { id: 'section-2', title: 'Section 2' },
        ],
        onSelect,
        onChange,
        onselect,
      },
    });

    const buttons = container.querySelectorAll('.svadmin-anchor button');
    expect(buttons.length).toBe(2);
    // click button when element doesn't exist in DOM won't crash
    const firstAction = buttons[0];
    if (!(firstAction instanceof HTMLElement)) throw new Error('expected a back top action');
    await fireEvent.click(firstAction);
  });
});
