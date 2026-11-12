import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TenantContextSwitcher from './TenantContextSwitcher.svelte';

describe('TenantContextSwitcher component suite', () => {
  it('renders current tenant name and tier badge', () => {
    const { getByText, container } = render(TenantContextSwitcher, {
      currentTenantId: 'tenant-corp-01',
      userRole: '全局主管',
    });

    expect(getByText('星谷数智总集团')).toBeTruthy();
    expect(getByText('HQ-GLOBAL')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="tenant-context-switcher"]')).toBeTruthy();
  });

  it('opens dropdown and allows selecting another tenant', async () => {
    const onSelect = vi.fn();
    const { container, getAllByText } = render(TenantContextSwitcher, {
      currentTenantId: 'tenant-corp-01',
      recentTenantIds: [],
      onTenantSelect: onSelect,
    });

    const trigger = container.querySelector('button[aria-haspopup="listbox"]');
    expect(trigger).toBeTruthy();
    await fireEvent.click(trigger);

    // Should display other tenants in dropdown
    const options = getAllByText('华东大区创新科技中心');
    expect(options.length).toBeGreaterThan(0);
    await fireEvent.click(options[0]);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tenant-east-02',
        name: '华东大区创新科技中心',
      })
    );
  });

  it('filters tenants when typing in the search bar', async () => {
    const { container, getByPlaceholderText } = render(TenantContextSwitcher, {
      currentTenantId: 'tenant-corp-01',
      recentTenantIds: [],
    });

    const trigger = container.querySelector('button[aria-haspopup="listbox"]');
    await fireEvent.click(trigger);

    const searchInput = getByPlaceholderText('搜索租户名称或编号...');
    expect(searchInput).toBeTruthy();
    await fireEvent.input(searchInput, { target: { value: 'SupaCloud' } });

    // The dropdown should only show matching SupaCloud
    const listbox = container.querySelector('[role="listbox"]');
    expect(listbox).toBeTruthy();
    expect(listbox.textContent).toContain('SupaCloud 云原生实验室');
    expect(listbox.textContent).not.toContain('华东大区创新科技中心');
  });
});
