import { describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { fireEvent, render } from '@testing-library/svelte';
import Card from './ui/card/card.svelte';
import Checkbox from './ui/checkbox/checkbox.svelte';
import Result from './Result.svelte';

describe('Card size options', () => {
  it('maps size="small" and size="mini" to data-size="sm"', () => {
    const { container: smallContainer } = render(Card, {
      props: { size: 'small' },
    });
    const smallCard = smallContainer.querySelector('[data-slot="card"]');
    expect(smallCard?.getAttribute('data-size')).toBe('sm');

    const { container: miniContainer } = render(Card, {
      props: { size: 'mini' },
    });
    const miniCard = miniContainer.querySelector('[data-slot="card"]');
    expect(miniCard?.getAttribute('data-size')).toBe('sm');
  });
});

describe('Checkbox size options', () => {
  it('maps size="small" and size="mini" to data-size="compact"', () => {
    const { container: smallContainer } = render(Checkbox, {
      props: { size: 'small' },
    });
    const smallCb = smallContainer.querySelector('[data-slot="checkbox"]');
    expect(smallCb?.getAttribute('data-size')).toBe('compact');

    const { container: miniContainer } = render(Checkbox, {
      props: { size: 'mini' },
    });
    const miniCb = miniContainer.querySelector('[data-slot="checkbox"]');
    expect(miniCb?.getAttribute('data-size')).toBe('compact');
  });

  it('renders children label and triggers onchange callback', async () => {
    const onchange = vi.fn();
    const labelSnippet = createRawSnippet(() => ({ render: () => '<span>Accept terms</span>' }));
    const { container } = render(Checkbox, {
      props: {
        defaultChecked: true,
        children: labelSnippet,
        onchange,
      },
    });

    const wrapper = container.querySelector('.svadmin-checkbox-wrapper');
    expect(wrapper).not.toBeNull();
    expect(container.textContent).toContain('Accept terms');

    const cbButton = container.querySelector('button[role="checkbox"]') as HTMLButtonElement;
    expect(cbButton.getAttribute('aria-checked')).toBe('true');

    await fireEvent.click(cbButton);
    expect(onchange).toHaveBeenCalledWith(false);
  });
});

describe('Result title and subtitle snippet support', () => {
  it('renders string title and subTitle correctly', () => {
    const { container } = render(Result, {
      props: {
        status: 'success',
        title: 'Operation Complete',
        subTitle: 'Your changes have been saved.',
      },
    });
    const titleEl = container.querySelector('.svadmin-result__title');
    const subtitleEl = container.querySelector('.svadmin-result__subtitle');
    expect(titleEl?.textContent?.trim()).toBe('Operation Complete');
    expect(subtitleEl?.textContent?.trim()).toBe('Your changes have been saved.');
  });
});
