import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import QueryFilter from './QueryFilter.svelte';

describe('QueryFilter', () => {
  it('renders search and reset buttons with Arco default text', () => {
    render(QueryFilter);

    expect(screen.getByRole('search')).toBeTruthy();
    expect(screen.getByRole('button', { name: '查询' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '重置' })).toBeTruthy();
    expect(screen.getByText('展开')).toBeTruthy();
  });

  it('triggers onsubmit when form is submitted', async () => {
    const onsubmit = vi.fn();
    render(QueryFilter, { onsubmit });

    const searchBtn = screen.getByRole('button', { name: '查询' });
    await fireEvent.click(searchBtn);

    expect(onsubmit).toHaveBeenCalled();
  });

  it('triggers onreset when reset button is clicked', async () => {
    const onreset = vi.fn();
    render(QueryFilter, { onreset });

    const resetBtn = screen.getByRole('button', { name: '重置' });
    await fireEvent.click(resetBtn);

    expect(onreset).toHaveBeenCalled();
  });

  it('toggles collapse state and invokes oncollapse callback', async () => {
    const oncollapse = vi.fn();
    render(QueryFilter, { defaultCollapsed: true, oncollapse });

    const toggleBtn = screen.getByRole('button', { name: '展开筛选' });
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

    await fireEvent.click(toggleBtn);

    expect(oncollapse).toHaveBeenCalledWith(false);
    expect(screen.getByText('收起')).toBeTruthy();
  });

  it('honors showResetButton and custom button labels', () => {
    render(QueryFilter, {
      showResetButton: false,
      searchBtnText: 'Filter Now',
    });

    expect(screen.queryByRole('button', { name: '重置' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Filter Now' })).toBeTruthy();
  });
});
