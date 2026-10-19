import { describe, expect, it } from 'bun:test';
import { buildProductMenuItems } from './product-navigation';
import type { ProductPlan } from './product-plan';

function planWithMenu(menu: ProductPlan['menu']): ProductPlan {
  return {
    schemaVersion: 'product/v1',
    brief: {
      id: 'brief',
      name: 'Operations',
      description: 'Operations workspace',
      primaryOutcome: 'Resolve work',
      primaryAudience: 'Operators',
      constraints: [],
      nonGoals: [],
      assumptions: [],
    },
    roles: [
      { id: 'operator', name: 'Operator', permissions: ['orders:read'] },
      { id: 'admin', name: 'Admin', permissions: ['*'] },
    ],
    workflows: [],
    resources: [{
      id: 'orders',
      name: 'orders',
      runtimeName: 'order-queue',
      label: 'Orders',
      fields: [],
      roleIds: [],
      workflowIds: [],
    }],
    actions: [],
    surfaces: [{
      id: 'operations',
      name: 'Operations',
      kind: 'workbench',
      purpose: 'Resolve work',
      workflowIds: [],
      resourceIds: ['orders'],
      roleIds: [],
      actionIds: [],
      sections: ['Queue'],
      states: ['loading', 'empty'],
    }],
    menu,
  };
}

describe('product menu adaptation', () => {
  it('maps product targets to hrefs and keeps menu size driven by the plan', () => {
    const plan = planWithMenu([
      { id: 'operations', label: 'Operations', surfaceId: 'operations', workflowIds: [], roleIds: [], placement: 'primary', order: 1 },
      { id: 'orders', label: 'Orders', resourceId: 'orders', workflowIds: [], roleIds: [], placement: 'secondary', order: 2 },
      { id: 'settings', label: 'Settings', href: '/settings', workflowIds: [], roleIds: [], placement: 'settings', order: 3 },
      { id: 'command', label: 'Run sync', workflowIds: [], roleIds: [], placement: 'command', order: 4 },
      { id: 'context', label: 'Related', workflowIds: [], roleIds: [], placement: 'context', order: 5 },
    ]);

    const items = buildProductMenuItems(plan, { roleIds: ['operator'] });

    expect(items.map(item => item.name)).toEqual(['operations', 'orders', 'settings']);
    expect(items[0]).toMatchObject({ href: '/workflows/operations' });
    expect(items[1]).toMatchObject({ href: '/order-queue', meta: { resource: 'order-queue' } });
    expect(items[2]).toMatchObject({ href: '/settings' });
  });

  it('uses a declared surface route when one is provided', () => {
    const plan = planWithMenu([
      { id: 'operations', label: 'Operations', surfaceId: 'operations', workflowIds: [], roleIds: [], placement: 'primary' },
    ]);
    const routedPlan = {
      ...plan,
      surfaces: plan.surfaces.map(surface => ({ ...surface, route: '/ops' })),
    };

    expect(buildProductMenuItems(routedPlan, { roleIds: ['operator'] })[0]).toMatchObject({ href: '/ops' });
  });

  it('supports explicitly including contextual and command placements', () => {
    const plan = planWithMenu([
      { id: 'primary', label: 'Primary', workflowIds: [], roleIds: [], placement: 'primary', order: 1 },
      { id: 'context', label: 'Related', workflowIds: [], roleIds: [], placement: 'context', order: 2 },
      { id: 'command', label: 'Run sync', workflowIds: [], roleIds: [], placement: 'command', order: 3 },
    ]);

    const items = buildProductMenuItems(
      plan,
      { roleIds: ['operator'] },
      { includePlacements: ['primary', 'context', 'command'] },
    );

    expect(items.map(item => item.name)).toEqual(['primary', 'context', 'command']);
  });

  it('does not promote children of a hidden or filtered parent', () => {
    const plan = planWithMenu([
      { id: 'admin', label: 'Admin', workflowIds: [], roleIds: ['admin'], placement: 'primary', order: 1 },
      { id: 'admin-child', label: 'Admin child', parentId: 'admin', workflowIds: [], roleIds: [], placement: 'primary', order: 1 },
    ]);

    expect(buildProductMenuItems(plan, { roleIds: ['operator'] })).toEqual([]);
  });

  it('preserves nested visible children under a visible parent', () => {
    const plan = planWithMenu([
      { id: 'root', label: 'Root', workflowIds: [], roleIds: [], placement: 'primary', order: 1 },
      { id: 'child', label: 'Child', parentId: 'root', workflowIds: [], roleIds: [], placement: 'secondary', order: 1 },
      { id: 'grandchild', label: 'Grandchild', parentId: 'child', workflowIds: [], roleIds: [], placement: 'settings', order: 1 },
    ]);

    expect(buildProductMenuItems(plan, { roleIds: ['operator'] })).toEqual([{
      name: 'root',
      label: 'Root',
      children: [{
        name: 'child',
        label: 'Child',
        children: [{ name: 'grandchild', label: 'Grandchild' }],
      }],
    }]);
  });
});
