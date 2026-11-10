import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Ribbon from './Ribbon.svelte';

describe('Ribbon', () => {
  it('renders ribbon text and placement correctly', () => {
    const { container } = render(Ribbon, {
      text: 'POPULAR',
      placement: 'end',
      color: 'primary',
    });

    const root = container.querySelector('[data-svadmin-component="Ribbon"]');
    expect(root).toBeTruthy();
    expect(screen.getByText('POPULAR')).toBeTruthy();

    const ribbonEl = container.querySelector('[data-placement="end"]');
    expect(ribbonEl).toBeTruthy();
    expect(ribbonEl?.className).toContain('-right-2');
  });

  it('renders start placement and custom color', () => {
    const { container } = render(Ribbon, {
      text: 'SPECIAL',
      placement: 'start',
      color: '#ff4d4f',
    });

    const ribbonEl = container.querySelector('[data-placement="start"]');
    expect(ribbonEl).toBeTruthy();
    expect(ribbonEl?.className).toContain('-left-2');
    expect(ribbonEl?.getAttribute('style')).toContain('#ff4d4f');
  });
});
