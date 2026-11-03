import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import {
  IconAudit,
  IconWorkflow,
  IconSeal,
  IconTenant,
  IconMonitor,
  IconSecurity,
  IconBilling,
  IconCluster,
  IconApprove,
  IconReject,
} from './index.js';

describe('Enterprise Business Icons Suite', () => {
  const iconList = [
    { component: IconAudit, name: 'IconAudit' },
    { component: IconWorkflow, name: 'IconWorkflow' },
    { component: IconSeal, name: 'IconSeal' },
    { component: IconTenant, name: 'IconTenant' },
    { component: IconMonitor, name: 'IconMonitor' },
    { component: IconSecurity, name: 'IconSecurity' },
    { component: IconBilling, name: 'IconBilling' },
    { component: IconCluster, name: 'IconCluster' },
    { component: IconApprove, name: 'IconApprove' },
    { component: IconReject, name: 'IconReject' },
  ];

  iconList.forEach(({ component, name }) => {
    it(`renders ${name} with default properties and data-svadmin-component`, () => {
      const { container } = render(component, { props: { size: 24, class: 'test-icon' } });
      const svg = container.querySelector(`[data-svadmin-component="${name}"]`);
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('width')).toBe('24px');
      expect(svg?.getAttribute('height')).toBe('24px');
      expect(svg?.classList.contains('test-icon')).toBe(true);
    });
  });
});
