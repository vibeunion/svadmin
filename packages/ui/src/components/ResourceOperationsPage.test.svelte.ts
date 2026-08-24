import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ResourceOperationsPage from './ResourceOperationsPage.svelte';

vi.mock('@svadmin/core', () => ({
  captureAdminContext: () => ({ navigate: vi.fn() }),
}));

vi.mock('./AutoTable.svelte', async () => {
  const table = await import('./ResourceOperationsPage.test-table.svelte');
  return { default: table.default };
});

const workspaceStyles = [
  'inventory',
  'operations',
  'orders',
  'people',
  'calendar',
  'communications',
  'crm',
  'property',
  'ai',
  'store',
  'planning',
  'generation',
  'billing',
  'security',
  'referral',
] as const;

describe('ResourceOperationsPage layout identities', () => {
  it.each(workspaceStyles)('renders a dedicated %s layout', (workspaceStyle) => {
    const page = render(ResourceOperationsPage, {
      resourceName: 'records',
      eyebrow: 'Example',
      title: 'Example records',
      description: 'Layout verification',
      actionLabel: 'Create',
      workspaceStyle,
      metrics: [{ label: 'Metric', value: 3, hint: 'metric hint' }],
      lanes: [{ label: 'Lane', value: 2, hint: 'lane hint' }],
      highlights: [{ title: 'Highlight', description: 'highlight detail', badge: 'Status' }],
    });

    expect(page.container.querySelector(`[data-svadmin-${workspaceStyle}-layout]`)).not.toBeNull();
    expect(page.container.querySelector('[data-svadmin-default-layout]')).toBeNull();
  });
});
