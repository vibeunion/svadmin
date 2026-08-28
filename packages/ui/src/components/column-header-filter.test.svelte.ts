import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import ColumnHeaderFilter from './ColumnHeaderFilter.svelte';

describe('ColumnHeaderFilter', () => {
  it('renders trigger button with filter icon', () => {
    const view = render(ColumnHeaderFilter, {
      field: { key: 'status', label: 'Status', type: 'select' },
    });

    const btn = view.container.querySelector('button[aria-label="Filter Status"]');
    expect(btn).toBeTruthy();
  });
});
