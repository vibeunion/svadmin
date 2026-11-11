import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import TenantQuotasMatrix from './TenantQuotasMatrix.svelte';

describe('TenantQuotasMatrix suite', () => {
  it('renders tenant quota gauges with used/limit percentages', () => {
    const view = render(TenantQuotasMatrix, {
      tenantName: 'Acme SaaS',
      planName: 'Enterprise VIP',
      quotas: [
        { id: 'api', resourceName: 'API 请求次数', used: 950, limit: 1000, unit: '次' },
      ],
    });

    expect(view.container.textContent).toContain('Acme SaaS');
    expect(view.container.textContent).toContain('API 请求次数');
    expect(view.container.textContent).toContain('95% 告警');
  });
});
