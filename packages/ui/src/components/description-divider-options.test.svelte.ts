import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render } from '@testing-library/svelte';
import DescriptionList from './content/DescriptionList.svelte';
import Divider from './Divider.svelte';

const textSnippet = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('DescriptionList enterprise design system options', () => {
  it('supports data prop alias, column prop alias, and colon option', () => {
    const { container } = render(DescriptionList, {
      props: {
        title: 'User Profile Details',
        data: [
          { label: 'Username', value: 'admin' },
          { label: 'Role', value: 'Super Administrator' },
        ],
        column: 2,
        colon: true,
      },
    });

    const colons = container.querySelectorAll('.svadmin-description-list__colon');
    expect(colons.length).toBe(2);
    expect(colons[0]?.textContent).toBe(':');
    expect(container.textContent).toContain('User Profile Details');
    expect(container.textContent).toContain('admin');
  });

  it('renders without colons when colon is false', () => {
    const { container } = render(DescriptionList, {
      props: {
        items: [{ label: 'Email', value: 'user@example.com' }],
        colon: false,
      },
    });

    expect(container.querySelector('.svadmin-description-list__colon')).toBeNull();
  });
});

describe('Divider enterprise design system options', () => {
  it('supports orientationMargin and custom style on horizontal divider with text', () => {
    const { container } = render(Divider, {
      props: {
        orientation: 'left',
        orientationMargin: 36,
        style: 'margin-top: 24px;',
        children: textSnippet('Section Break'),
      },
    });

    const divider = container.querySelector('[data-svadmin-component="Divider"]');
    expect(divider).not.toBeNull();
    expect(divider?.getAttribute('style')).toContain('margin-top: 24px;');

    const leftLine = divider?.querySelector('span');
    expect(leftLine?.getAttribute('style')).toContain('width: 36px');
    expect(divider?.textContent).toContain('Section Break');
  });

  it('supports dashed and custom style on vertical divider', () => {
    const { container } = render(Divider, {
      props: {
        type: 'vertical',
        dashed: true,
        style: 'height: 16px;',
      },
    });

    const divider = container.querySelector('[data-svadmin-type="vertical"]');
    expect(divider).not.toBeNull();
    expect(divider?.getAttribute('style')).toContain('height: 16px;');
    expect(divider?.className).toContain('border-dashed');
  });
});
