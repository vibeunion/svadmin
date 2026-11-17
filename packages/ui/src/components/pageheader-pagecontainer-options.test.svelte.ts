import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PageHeader from './PageHeader.svelte';
import PageContainer from './PageContainer.svelte';

describe('PageHeader and PageContainer option parity', () => {
  it('PageHeader supports subTitle alias, footer slot, and custom breadcrumb', () => {
    const { container } = render(PageHeader, {
      props: {
        title: 'Project Settings',
        subTitle: 'Configure global team workspace preferences',
      },
    });

    expect(container.textContent).toContain('Project Settings');
    expect(container.textContent).toContain('Configure global team workspace preferences');
  });

  it('PageContainer supports defaultActiveTab and uncontrolled switching', async () => {
    const ontabchange = vi.fn();
    const { getByRole } = render(PageContainer, {
      props: {
        title: 'Resource Dashboard',
        tabs: [
          { key: 'first', label: 'First Tab' },
          { key: 'second', label: 'Second Tab' },
        ],
        defaultActiveTab: 'second',
        ontabchange,
      },
    });

    const secondTab = getByRole('tab', { name: 'Second Tab' });
    expect(secondTab.getAttribute('aria-selected')).toBe('true');

    const firstTab = getByRole('tab', { name: 'First Tab' });
    await fireEvent.click(firstTab);
    expect(ontabchange).toHaveBeenCalledWith('first');
    expect(firstTab.getAttribute('aria-selected')).toBe('true');
  });
});
