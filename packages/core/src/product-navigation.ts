import type { ProductMenuNode, ProductNavigationNode, ProductPlan } from './product-plan';

export interface ProductNavigationContext {
  readonly roleIds: readonly string[];
  readonly featureFlags?: Readonly<Record<string, boolean>>;
}

function canSeeByRole(item: ProductMenuNode, roleIds: readonly string[]): boolean {
  // Empty roleIds means the entry is public at the UI hint layer. Backend authorization remains authoritative.
  return item.roleIds.length === 0 || item.roleIds.some(roleId => roleIds.includes(roleId));
}

function conditionEnabled(condition: string | undefined, flags: Readonly<Record<string, boolean>> | undefined): boolean {
  return condition === undefined ? true : flags?.[condition] === true;
}

function createNode(item: ProductMenuNode, allItems: readonly ProductMenuNode[], context: ProductNavigationContext): ProductNavigationNode {
  const visibleByRole = canSeeByRole(item, context.roleIds);
  const visibleByCondition = conditionEnabled(item.condition, context.featureFlags);
  const visible = visibleByRole && visibleByCondition && item.placement !== 'hidden';
  const children = allItems
    .filter(candidate => candidate.parentId === item.id)
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .map(candidate => createNode(candidate, allItems, context));
  return {
    ...item,
    children,
    visible,
    ...(visible ? {} : { reason: visibleByRole ? 'hidden by business condition or placement' : 'current role is not allowed to see this entry' }),
  };
}

/**
 * Builds menu entries from product decisions. There is deliberately no fixed
 * menu count: domain complexity determines the number of entries, while review
 * checks whether each entry has a role, workflow, resource or surface target.
 */
export function buildProductNavigation(plan: ProductPlan, context: ProductNavigationContext): ProductNavigationNode[] {
  return plan.menu
    .filter(item => item.parentId === undefined)
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .map(item => createNode(item, plan.menu, context));
}

export function flattenVisibleProductNavigation(nodes: readonly ProductNavigationNode[]): ProductNavigationNode[] {
  return nodes.flatMap(node => node.visible
    ? [node, ...flattenVisibleProductNavigation(node.children)]
    : flattenVisibleProductNavigation(node.children));
}
