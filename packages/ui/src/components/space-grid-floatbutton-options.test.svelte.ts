import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Space from './Space.svelte';
import Row from './Row.svelte';
import Col from './Col.svelte';
import FloatButton from './FloatButton.svelte';

describe('Space, Row, Col, and FloatButton option parity', () => {
  it('renders Space with tuple size, middle align, and space-between justify', () => {
    const view = render(Space, {
      size: [12, 24],
      align: 'middle',
      justify: 'space-between',
    });

    const el = view.container.querySelector('.svadmin-space') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.alignItems).toBe('center');
    expect(el.style.justifyContent).toBe('space-between');
    expect(el.style.getPropertyValue('--svadmin-space-gap')).toBe('24px 12px');
  });

  it('renders Row with middle align and space-between justify', () => {
    const view = render(Row, {
      align: 'middle',
      justify: 'space-between',
    });

    const el = view.container.querySelector('.svadmin-row') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.alignItems).toBe('center');
    expect(el.style.justifyContent).toBe('space-between');
  });

  it('renders Col with xs span and xsOffset', () => {
    const view = render(Col, {
      xs: 12,
      xsOffset: 2,
    });

    const el = view.container.querySelector('.svadmin-col') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.getAttribute('style')).toContain('--svadmin-col-span: 12');
    expect(el.getAttribute('style')).toContain('--svadmin-col-start: 3');
  });

  it('renders FloatButton with tooltip', () => {
    const view = render(FloatButton, {
      tooltip: '回到顶部',
    });

    const btn = view.container.querySelector('button');
    expect(btn?.getAttribute('title')).toBe('回到顶部');
    expect(btn?.getAttribute('aria-label')).toBe('回到顶部');
  });
});
