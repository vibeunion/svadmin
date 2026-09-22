import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Marquee from './Marquee.svelte';

afterEach(() => cleanup());

describe('Marquee', () => {
  it('duplicates content for a seamless loop and hides clones from assistive tech', () => {
    const view = render(Marquee, { text: 'Breaking news', repeat: 3 });
    const items = [...view.container.querySelectorAll('.svadmin-marquee__item')];
    expect(items).toHaveLength(3);
    expect(items[0]?.textContent).toBe('Breaking news');
    expect(items[0]?.getAttribute('aria-hidden')).toBeNull();
    expect(items[1]?.getAttribute('aria-hidden')).toBe('true');
    expect(items[2]?.getAttribute('aria-hidden')).toBe('true');
  });

  it('exposes direction, vertical and fade as data attributes with a duration variable', () => {
    const view = render(Marquee, {
      text: 'x',
      duration: 20,
      direction: 'right',
      vertical: true,
      fade: false,
    });
    const root = view.container.querySelector('.svadmin-marquee');
    expect(root?.getAttribute('data-direction')).toBe('right');
    expect(root?.getAttribute('data-vertical')).toBe('true');
    expect(root?.getAttribute('data-fade')).toBe('false');
    expect(view.container.querySelector('.svadmin-marquee__track')?.getAttribute('style')).toContain('20s');
  });

  it('clamps repeat to at least two copies and falls back on invalid duration', () => {
    const view = render(Marquee, { text: 'x', repeat: 0, duration: -1 });
    expect(view.container.querySelectorAll('.svadmin-marquee__item')).toHaveLength(2);
    expect(view.container.querySelector('.svadmin-marquee__track')?.getAttribute('style')).toContain('14s');
  });
});