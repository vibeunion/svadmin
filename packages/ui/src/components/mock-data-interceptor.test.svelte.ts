import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MockDataInterceptor from './MockDataInterceptor.svelte';

describe('MockDataInterceptor component suite', () => {
  it('renders interceptor master switch and rule endpoints', () => {
    const { getByText, getAllByText } = render(MockDataInterceptor, {
      title: '离线 Mock 控制台'
    });

    expect(getByText('离线 Mock 控制台')).toBeTruthy();
    expect(getAllByText('/api/v1/users/me').length).toBeGreaterThanOrEqual(1);
    expect(getByText('/api/v1/billing/invoices')).toBeTruthy();
  });

  it('runs mock test on button click', async () => {
    const { container, findByText } = render(MockDataInterceptor);

    const runBtn = container.querySelector('tbody button');
    if (runBtn) {
      await fireEvent.click(runBtn);
      const resTitle = await findByText(/模拟测试结果:/);
      expect(resTitle).toBeTruthy();
    }
  });

  it('toggles master interceptor status', async () => {
    let activeState: boolean | null = null;
    const { getByLabelText } = render(MockDataInterceptor, {
      onToggleActive: (state) => {
        activeState = state;
      }
    });

    const toggle = getByLabelText('Toggle Mock Interceptor');
    await fireEvent.click(toggle);
    expect(activeState).toBe(false);
  });
});
