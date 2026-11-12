import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DataScopeRuleEditor, { type DataScopeRule } from './DataScopeRuleEditor.svelte';

describe('DataScopeRuleEditor Component', () => {
  const resources = [
    { key: 'orders', label: '财务订单' },
    { key: 'customers', label: '客户资料' },
  ];

  const initialRules: DataScopeRule[] = [
    { resource: 'orders', scopeType: 'self_only' },
    { resource: 'customers', scopeType: 'dept_and_sub' },
  ];

  it('renders role name and resource scope options', () => {
    const { container } = render(DataScopeRuleEditor, {
      props: {
        roleName: '销售主管',
        resources,
        initialRules,
      },
    });

    const root = container.querySelector('[data-svadmin-component="DataScopeRuleEditor"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('数据行级权限规则中心');
    expect(container.textContent).toContain('销售主管');
    expect(container.textContent).toContain('财务订单');
    expect(container.textContent).toContain('客户资料');
  });

  it('triggers onchange when radio option is toggled', async () => {
    const onChange = vi.fn();
    const { container } = render(DataScopeRuleEditor, {
      props: {
        roleName: '销售主管',
        resources,
        initialRules,
        onchange: onChange,
      },
    });

    const radios = container.querySelectorAll('input[type="radio"]');
    if (radios[0]) {
      await fireEvent.change(radios[0]);
      expect(onChange).toHaveBeenCalled();
    }
  });
});
