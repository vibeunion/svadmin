import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import DescriptionList from './DescriptionList.svelte';

describe('DescriptionList enterprise capabilities', () => {
  it('renders standard items without errors', () => {
    const view = render(DescriptionList, {
      items: [
        { label: 'Name', value: 'Alice' },
        { label: 'Role', value: 'Admin', description: 'Primary administrator' },
        { label: 'Website', value: 'example.com', href: 'https://example.com' },
      ],
    });
    expect(view.container.textContent).toContain('Alice');
    expect(view.container.textContent).toContain('Admin');
    expect(view.container.textContent).toContain('Primary administrator');
    expect(view.container.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
  });

  it('safely handles duplicate labels in bordered and unbordered layouts', () => {
    const duplicateItems = [
      { label: 'Status', value: 'Active' },
      { label: 'Status', value: 'Verified' },
      { label: 'Note', value: 'First note' },
      { label: 'Note', value: 'Second note' },
    ];

    const unbordered = render(DescriptionList, { items: duplicateItems, bordered: false });
    expect(unbordered.container.textContent).toContain('Active');
    expect(unbordered.container.textContent).toContain('Verified');
    unbordered.unmount();

    const bordered = render(DescriptionList, { items: duplicateItems, bordered: true });
    expect(bordered.container.textContent).toContain('First note');
    expect(bordered.container.textContent).toContain('Second note');
    bordered.unmount();
  });
});
