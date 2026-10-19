import { describe, expect, it } from 'vitest';
import { buildProductNavigation } from './product-navigation';
import { parseProductPlan } from './product-plan';
import { reviewProductPlan } from './product-review';
import type { ProductPlan } from './product-plan';

function planWithMenu(menu: ProductPlan['menu']): ProductPlan {
  return {
    schemaVersion: 'product/v1',
    brief: { id: 'brief', name: 'Orders', description: 'Order operations', primaryOutcome: 'Resolve orders', primaryAudience: 'Operators', constraints: [], nonGoals: [], assumptions: [] },
    roles: [{ id: 'operator', name: 'Operator', permissions: ['orders:read'] }],
    workflows: [{ id: 'resolve-order', name: 'Resolve order', actorRoleIds: ['operator'], trigger: 'A flagged order appears', goal: 'Resolve the order', steps: ['Review', 'Resolve'], successCriteria: ['Order is resolved'], exceptions: [], priority: 'core', frequency: 'high' }],
    resources: [{ id: 'orders', name: 'orders', label: 'Orders', fields: [], roleIds: ['operator'], workflowIds: ['resolve-order'] }],
    actions: [],
    surfaces: [{ id: 'orders-workbench', name: 'Order workbench', kind: 'workbench', purpose: 'Resolve flagged orders', workflowIds: ['resolve-order'], resourceIds: ['orders'], roleIds: ['operator'], actionIds: [], sections: ['Needs attention'], states: ['loading', 'empty', 'error', 'forbidden'] }],
    menu,
  };
}

describe('product planning layer', () => {
  it('accepts a plan and keeps a large business menu intact', () => {
    const menu = Array.from({ length: 18 }, (_, index) => ({ id: `entry-${index}`, label: `Entry ${index}`, workflowIds: ['resolve-order'], roleIds: ['operator'], placement: 'primary' as const, order: index }));
    const plan = parseProductPlan(planWithMenu(menu));
    expect(plan.menu).toHaveLength(18);
    expect(buildProductNavigation(plan, { roleIds: ['operator'] })).toHaveLength(18);
  });

  it('filters role-specific navigation without changing the product plan', () => {
    const plan = parseProductPlan(planWithMenu([
      { id: 'orders', label: 'Orders', workflowIds: ['resolve-order'], roleIds: ['operator'], placement: 'primary' },
      { id: 'admin', label: 'Settings', workflowIds: [], roleIds: ['admin'], placement: 'settings' },
    ]));
    const nodes = buildProductNavigation(plan, { roleIds: ['operator'] });
    expect(nodes.map(node => [node.label, node.visible])).toEqual([['Orders', true], ['Settings', false]]);
  });

  it('reports unserved core workflows and density without imposing a menu count', () => {
    const plan = planWithMenu([]);
    const surface = plan.surfaces[0]!;
    const report = reviewProductPlan({ ...plan, surfaces: [{ ...surface, sections: ['1', '2', '3', '4', '5', '6', '7'] }] });
    expect(report.ok).toBe(true);
    expect(report.metrics.menuNodeCount).toBe(0);
    expect(report.issues.some(issue => issue.code === 'surface.section-density')).toBe(true);
  });
});
