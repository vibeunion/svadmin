import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Anchor from './Anchor.svelte';
import Carousel from './Carousel.svelte';

describe('Anchor href and title item aliases', () => {
  it('renders anchor links using href and title item properties', () => {
    const { container } = render(Anchor, {
      props: {
        items: [
          { href: '#section-1', title: 'First Section' },
          { href: '#section-2', title: 'Second Section' },
        ],
      },
    });
    const buttons = container.querySelectorAll('.svadmin-anchor button');
    expect(buttons.length).toBe(2);
    expect(buttons[0]?.textContent?.trim()).toBe('First Section');
    expect(buttons[1]?.textContent?.trim()).toBe('Second Section');
  });
});

describe('Carousel current and showArrow options', () => {
  it('supports showArrow alias for arrowType', () => {
    const { container } = render(Carousel, {
      props: {
        count: 3,
        showArrow: 'always',
      },
    });
    const section = container.querySelector('.svadmin-carousel');
    expect(section?.getAttribute('data-arrow-type')).toBe('always');
  });

  it('supports current prop alias for index', () => {
    const { container } = render(Carousel, {
      props: {
        count: 4,
        current: 2,
      },
    });
    const activeSlide = container.querySelector('.svadmin-carousel__slide[aria-hidden="false"]');
    expect(activeSlide?.getAttribute('aria-label')).toBe('3 / 4');
  });
});
