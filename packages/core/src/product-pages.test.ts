import { describe, expect, it } from 'bun:test';
import type { ProductPlan } from './product-plan';
import { buildProductPagePlan } from './product-pages';

const plan: ProductPlan = {
  schemaVersion: 'product/v1',
  brief: {
    id: 'brief',
    name: 'Operations',
    description: 'Operations',
    primaryOutcome: 'Resolve work',
    primaryAudience: 'Operators',
    constraints: [],
    nonGoals: [],
    assumptions: [],
  },
  roles: [{ id: 'operator', name: 'Operator', permissions: [] }],
  workflows: [{
    id: 'resolve',
    name: 'Resolve',
    actorRoleIds: ['operator'],
    trigger: 'A task arrives',
    goal: 'Resolve it',
    steps: ['Review'],
    successCriteria: ['Resolved'],
    exceptions: [],
    priority: 'core',
    frequency: 'high',
  }],
  resources: [
    {
      id: 'tasks',
      name: 'tasks',
      label: 'Tasks',
      fields: [],
      roleIds: ['operator'],
      workflowIds: ['resolve'],
    },
    {
      id: 'comments',
      name: 'comments',
      label: 'Comments',
      fields: [],
      roleIds: ['operator'],
      workflowIds: ['resolve'],
    },
  ],
  actions: [],
  surfaces: [{
    id: 'workbench',
    name: 'Workbench',
    kind: 'workbench',
    purpose: 'Resolve work',
    workflowIds: ['resolve'],
    resourceIds: ['tasks', 'comments'],
    roleIds: ['operator'],
    actionIds: [],
    sections: ['Queue', 'History'],
    states: ['loading', 'empty', 'error', 'forbidden', 'success'],
  }],
  menu: [],
};

describe('product page plans', () => {
  it('does not duplicate the surface resource list in every generated section', () => {
    const surface = plan.surfaces[0];
    if (!surface) throw new Error('Fixture is incomplete');
    const page = buildProductPagePlan(surface, plan);
    expect(page.sections.map(section => section.resourceIds)).toEqual([
      ['tasks', 'comments'],
      [],
    ]);
  });
});
