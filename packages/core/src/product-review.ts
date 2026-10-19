import type { ProductPlan, ProductSurface } from './product-plan';

export type ProductReviewSeverity = 'error' | 'warning' | 'info';

export interface ProductReviewIssue {
  readonly code: string;
  readonly severity: ProductReviewSeverity;
  readonly message: string;
  readonly path?: string;
  readonly suggestion?: string;
}

export interface ProductReviewMetrics {
  readonly resourceCount: number;
  readonly workflowCount: number;
  readonly surfaceCount: number;
  readonly menuNodeCount: number;
  readonly orphanResourceCount: number;
  readonly unservedWorkflowCount: number;
  readonly roleVisibilityGaps: number;
}

export interface ProductReviewReport {
  readonly ok: boolean;
  readonly issues: readonly ProductReviewIssue[];
  readonly metrics: ProductReviewMetrics;
}

function has<T>(set: ReadonlySet<T>, value: T): boolean { return set.has(value); }
function addIssue(issues: ProductReviewIssue[], issue: ProductReviewIssue): void { issues.push(issue); }

export function reviewProductPlan(plan: ProductPlan): ProductReviewReport {
  const issues: ProductReviewIssue[] = [];
  const roleIds = new Set(plan.roles.map(role => role.id));
  const workflowIds = new Set(plan.workflows.map(workflow => workflow.id));
  const resourceIds = new Set(plan.resources.map(resource => resource.id));
  const surfaceIds = new Set(plan.surfaces.map(surface => surface.id));
  const actionIds = new Set(plan.actions.map(action => action.id));

  for (const workflow of plan.workflows) {
    if (!workflow.actorRoleIds.length) addIssue(issues, { code: 'workflow.missing-actor', severity: 'error', message: `Workflow "${workflow.name}" has no actor role.`, path: `workflows.${workflow.id}.actorRoleIds` });
    for (const roleId of workflow.actorRoleIds) if (!has(roleIds, roleId)) addIssue(issues, { code: 'workflow.unknown-role', severity: 'error', message: `Workflow "${workflow.name}" references unknown role "${roleId}".`, path: `workflows.${workflow.id}.actorRoleIds` });
    if (!workflow.goal.trim()) addIssue(issues, { code: 'workflow.missing-goal', severity: 'error', message: `Workflow "${workflow.name}" has no user goal.`, path: `workflows.${workflow.id}.goal` });
  }

  for (const resource of plan.resources) {
    if (!resource.workflowIds.length && !resource.internal) addIssue(issues, { code: 'resource.no-workflow', severity: 'warning', message: `Resource "${resource.label}" is not attached to a workflow.`, path: `resources.${resource.id}.workflowIds`, suggestion: 'Make it contextual/internal or attach it to a real task.' });
    for (const workflowId of resource.workflowIds) if (!has(workflowIds, workflowId)) addIssue(issues, { code: 'resource.unknown-workflow', severity: 'error', message: `Resource "${resource.label}" references unknown workflow "${workflowId}".`, path: `resources.${resource.id}.workflowIds` });
  }

  for (const surface of plan.surfaces) {
    reviewSurface(surface, { workflowIds, actionIds, resourceIds }, issues);
  }

  const menuById = new Map(plan.menu.map(item => [item.id, item] as const));
  for (const item of plan.menu) {
    if (item.parentId !== undefined && !menuById.has(item.parentId)) {
      addIssue(issues, { code: 'menu.unknown-parent', severity: 'error', message: `Menu item "${item.label}" references unknown parent "${item.parentId}".`, path: `menu.${item.id}.parentId` });
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visitMenu = (id: string): void => {
    if (visiting.has(id)) {
      addIssue(issues, { code: 'menu.cycle', severity: 'error', message: `Menu hierarchy contains a cycle at "${id}".`, path: `menu.${id}.parentId` });
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const parentId = menuById.get(id)?.parentId;
    if (parentId !== undefined && menuById.has(parentId)) visitMenu(parentId);
    visiting.delete(id);
    visited.add(id);
  };
  for (const item of plan.menu) visitMenu(item.id);

  for (const item of plan.menu) {
    if (!item.workflowIds.length && !item.resourceId && !item.surfaceId) addIssue(issues, { code: 'menu.no-business-target', severity: 'warning', message: `Menu item "${item.label}" has no workflow, resource or surface target.`, path: `menu.${item.id}`, suggestion: 'Keep it only for an intentional external/system entry.' });
    if (item.surfaceId && !has(surfaceIds, item.surfaceId)) addIssue(issues, { code: 'menu.unknown-surface', severity: 'error', message: `Menu item "${item.label}" references unknown surface.`, path: `menu.${item.id}.surfaceId` });
    if (item.resourceId && !has(resourceIds, item.resourceId)) addIssue(issues, { code: 'menu.unknown-resource', severity: 'error', message: `Menu item "${item.label}" references unknown resource.`, path: `menu.${item.id}.resourceId` });
    if (!item.roleIds.length && item.placement !== 'hidden') addIssue(issues, { code: 'menu.public-entry', severity: 'info', message: `Menu item "${item.label}" is public at the UI hint layer.`, path: `menu.${item.id}.roleIds`, suggestion: 'Keep server authorization independent from menu visibility.' });
  }

  for (const action of plan.actions) {
    if (!has(workflowIds, action.workflowId)) addIssue(issues, { code: 'action.unknown-workflow', severity: 'error', message: `Action "${action.label}" references unknown workflow.`, path: `actions.${action.id}.workflowId` });
    if (!action.roleIds.length) addIssue(issues, { code: 'action.missing-roles', severity: 'warning', message: `Action "${action.label}" has no role visibility contract.`, path: `actions.${action.id}.roleIds` });
  }

  const served = new Set<string>();
  plan.surfaces.forEach(surface => surface.workflowIds.forEach(id => served.add(id)));
  plan.menu.forEach(item => item.workflowIds.forEach(id => served.add(id)));
  const unserved = plan.workflows.filter(workflow => !served.has(workflow.id));
  unserved.forEach(workflow => addIssue(issues, { code: 'workflow.unserved', severity: workflow.priority === 'core' ? 'error' : 'warning', message: `Workflow "${workflow.name}" has no page or menu entry.`, path: `workflows.${workflow.id}`, suggestion: 'Add a surface or contextual entry, or mark the workflow as deferred.' }));

  const roleVisibilityGaps = plan.workflows.filter(workflow => workflow.actorRoleIds.length > 0 && !plan.surfaces.some(surface => surface.workflowIds.includes(workflow.id) && (surface.roleIds.length === 0 || workflow.actorRoleIds.some(roleId => surface.roleIds.includes(roleId))))).length;
  const orphanResourceCount = plan.resources.filter(resource => resource.workflowIds.length === 0 && !resource.internal).length;
  const errors = issues.filter(issue => issue.severity === 'error');
  return {
    ok: errors.length === 0,
    issues,
    metrics: {
      resourceCount: plan.resources.length,
      workflowCount: plan.workflows.length,
      surfaceCount: plan.surfaces.length,
      menuNodeCount: plan.menu.length,
      orphanResourceCount,
      unservedWorkflowCount: unserved.length,
      roleVisibilityGaps,
    },
  };
}

function reviewSurface(surface: ProductSurface, refs: { workflowIds: ReadonlySet<string>; actionIds: ReadonlySet<string>; resourceIds: ReadonlySet<string> }, issues: ProductReviewIssue[]): void {
  if (!surface.purpose.trim()) addIssue(issues, { code: 'surface.missing-purpose', severity: 'error', message: `Surface "${surface.name}" has no purpose.`, path: `surfaces.${surface.id}.purpose` });
  if (!surface.workflowIds.length) addIssue(issues, { code: 'surface.no-workflow', severity: 'warning', message: `Surface "${surface.name}" is not attached to a workflow.`, path: `surfaces.${surface.id}.workflowIds` });
  surface.workflowIds.forEach(id => { if (!refs.workflowIds.has(id)) addIssue(issues, { code: 'surface.unknown-workflow', severity: 'error', message: `Surface "${surface.name}" references unknown workflow "${id}".`, path: `surfaces.${surface.id}.workflowIds` }); });
  surface.resourceIds.forEach(id => { if (!refs.resourceIds.has(id)) addIssue(issues, { code: 'surface.unknown-resource', severity: 'error', message: `Surface "${surface.name}" references unknown resource "${id}".`, path: `surfaces.${surface.id}.resourceIds` }); });
  surface.actionIds.forEach(id => { if (!refs.actionIds.has(id)) addIssue(issues, { code: 'surface.unknown-action', severity: 'error', message: `Surface "${surface.name}" references unknown action "${id}".`, path: `surfaces.${surface.id}.actionIds` }); });
  if (surface.primaryActionId && !refs.actionIds.has(surface.primaryActionId)) addIssue(issues, { code: 'surface.unknown-primary-action', severity: 'error', message: `Surface "${surface.name}" references unknown primary action.`, path: `surfaces.${surface.id}.primaryActionId` });
  if (!surface.states.length) addIssue(issues, { code: 'surface.missing-states', severity: 'warning', message: `Surface "${surface.name}" does not declare empty/loading/error/permission states.`, path: `surfaces.${surface.id}.states`, suggestion: 'Declare the states the Svelte view must implement.' });
  if (surface.sections.length > 6) addIssue(issues, { code: 'surface.section-density', severity: 'warning', message: `Surface "${surface.name}" contains ${surface.sections.length} sections.`, path: `surfaces.${surface.id}.sections`, suggestion: 'Group related information or use progressive disclosure.' });
  if (surface.actionIds.length > 4) addIssue(issues, { code: 'surface.action-density', severity: 'warning', message: `Surface "${surface.name}" exposes ${surface.actionIds.length} actions.`, path: `surfaces.${surface.id}.actionIds`, suggestion: 'Keep one primary action and move secondary actions into context or More.' });
}
