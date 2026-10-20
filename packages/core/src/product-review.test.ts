import { describe, expect, it } from 'bun:test';
import type { ProductPlan } from './product-plan';
import { reviewProductPlan } from './product-review';

const basePlan: ProductPlan = {
  schemaVersion: 'product/v1',
  brief: {
    id: 'dispatch',
    name: 'Dispatch',
    description: 'Dispatch work',
    primaryOutcome: 'Resolve work quickly',
    primaryAudience: 'Operators',
    constraints: [],
    nonGoals: [],
    assumptions: [],
  },
  roles: [{ id: 'operator', name: 'Operator', permissions: ['tasks:read'] }],
  workflows: [{
    id: 'assign-task',
    name: 'Assign task',
    actorRoleIds: ['operator'],
    trigger: 'A task arrives',
    goal: 'Assign a task',
    steps: ['Review task'],
    successCriteria: ['Task has an owner'],
    exceptions: [],
    priority: 'core',
    frequency: 'high',
  }],
  resources: [{
    id: 'tasks',
    name: 'tasks',
    label: 'Tasks',
    fields: [{
      id: 'title',
      label: 'Title',
      type: 'text',
      readableBy: ['operator'],
      writableBy: ['operator'],
      usedByWorkflowIds: ['assign-task'],
    }],
    roleIds: ['operator'],
    workflowIds: ['assign-task'],
  }],
  actions: [{
    id: 'assign',
    label: 'Assign',
    workflowId: 'assign-task',
    roleIds: ['operator'],
  }],
  surfaces: [{
    id: 'task-workbench',
    name: 'Task workbench',
    kind: 'workbench',
    purpose: 'Assign work',
    workflowIds: ['assign-task'],
    resourceIds: ['tasks'],
    roleIds: ['operator'],
    actionIds: ['assign'],
    sections: ['Queue'],
    states: ['loading', 'empty', 'error', 'forbidden', 'success'],
  }],
  menu: [{
    id: 'tasks',
    label: 'Tasks',
    surfaceId: 'task-workbench',
    workflowIds: ['assign-task'],
    roleIds: ['operator'],
    placement: 'primary',
  }],
};

describe('product plan review cross references', () => {
  it('rejects unknown role and workflow references before generation', () => {
    const resource = basePlan.resources[0];
    const field = resource?.fields[0];
    const surface = basePlan.surfaces[0];
    const action = basePlan.actions[0];
    const menu = basePlan.menu[0];
    if (!resource || !field || !surface || !action || !menu) throw new Error('Fixture is incomplete');

    const report = reviewProductPlan({
      ...basePlan,
      resources: [{
        ...resource,
        roleIds: ['missing-role'],
        fields: [{ ...field, readableBy: ['missing-role'], usedByWorkflowIds: ['missing-workflow'] }],
      }],
      surfaces: [{ ...surface, roleIds: ['missing-role'], parentSurfaceId: 'missing-parent' }],
      actions: [{ ...action, roleIds: ['missing-role'] }],
      menu: [{ ...menu, roleIds: ['missing-role'], workflowIds: ['missing-workflow'] }],
    });

    expect(report.ok).toBe(false);
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'resource.unknown-role',
      'field.unknown-role',
      'field.unknown-workflow',
      'surface.unknown-role',
      'surface.unknown-parent',
      'action.unknown-role',
      'menu.unknown-role',
      'menu.unknown-workflow',
    ]));
  });

  it('rejects generated route collisions and surface cycles', () => {
    const surface = basePlan.surfaces[0];
    const resource = basePlan.resources[0];
    if (!surface || !resource) throw new Error('Fixture is incomplete');

    const report = reviewProductPlan({
      ...basePlan,
      resources: [
        resource,
        { ...resource, id: 'task-copy', label: 'Task copy' },
      ],
      surfaces: [
        { ...surface, id: 'first', name: 'First', route: '/same', parentSurfaceId: 'second' },
        { ...surface, id: 'second', name: 'Second', route: '/same', parentSurfaceId: 'first' },
      ],
    });

    expect(report.ok).toBe(false);
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'resource.duplicate-runtime-name',
      'surface.duplicate-route',
      'surface.cycle',
    ]));
  });
});
