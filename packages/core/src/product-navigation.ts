import type { MenuItem } from './types';
import type {
  ProductMenuNode,
  ProductMenuPlacement,
  ProductNavigationNode,
  ProductPlan,
  ProductSurface,
} from './product-plan';

export interface ProductNavigationContext {
  readonly roleIds: readonly string[];
  readonly featureFlags?: Readonly<Record<string, boolean>>;
}

export interface ProductMenuOptions {
  /**
   * Placements that may become sidebar menu items. Contextual and command
   * entries stay out of the persistent navigation unless explicitly opted in.
   */
  readonly includePlacements?: readonly ProductMenuPlacement[];
}

const DEFAULT_MENU_PLACEMENTS: readonly ProductMenuPlacement[] = ['primary', 'secondary', 'settings'];

function canSeeByRole(item: ProductMenuNode, roleIds: readonly string[]): boolean {
  // Empty roleIds means the entry is public at the UI hint layer. Backend authorization remains authoritative.
  return item.roleIds.length === 0 || item.roleIds.some(roleId => roleIds.includes(roleId));
}

function conditionEnabled(condition: string | undefined, flags: Readonly<Record<string, boolean>> | undefined): boolean {
  return condition === undefined ? true : flags?.[condition] === true;
}

function createNode(
  item: ProductMenuNode,
  allItems: readonly ProductMenuNode[],
  context: ProductNavigationContext,
  ancestry: ReadonlySet<string> = new Set(),
): ProductNavigationNode {
  const visibleByRole = canSeeByRole(item, context.roleIds);
  const visibleByCondition = conditionEnabled(item.condition, context.featureFlags);
  const visible = visibleByRole && visibleByCondition && item.placement !== 'hidden';
  const nextAncestry = new Set(ancestry);
  nextAncestry.add(item.id);
  const children = nextAncestry.has(item.id)
    ? allItems
      .filter(candidate => candidate.parentId === item.id && !nextAncestry.has(candidate.id))
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
      .map(candidate => createNode(candidate, allItems, context, nextAncestry))
    : [];
  return {
    ...item,
    children,
    visible,
    ...(visible ? {} : { reason: visibleByRole ? 'hidden by business condition or placement' : 'current role is not allowed to see this entry' }),
  };
}

/**
 * Builds a product navigation tree from product decisions. There is
 * deliberately no fixed menu count: domain complexity determines the number
 * of entries, while review checks whether each entry has a role, workflow,
 * resource or surface target.
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
    : []);
}

function surfaceRoute(surface: ProductSurface | undefined): string | undefined {
  if (surface === undefined) return undefined;
  // route is optional so older product/v1 plans keep a stable generated URL.
  const route = (surface as ProductSurface & { readonly route?: string }).route;
  return route ?? `/workflows/${surface.id}`;
}

function resourceName(plan: ProductPlan, resourceId: string | undefined): string | undefined {
  if (resourceId === undefined) return undefined;
  const resource = plan.resources.find(candidate => candidate.id === resourceId);
  return resource?.runtimeName ?? resource?.name;
}

function menuHref(
  plan: ProductPlan,
  node: ProductNavigationNode,
  surfaces: ReadonlyMap<string, ProductSurface>,
): string | undefined {
  if (node.href !== undefined) return node.href;
  const bySurface = surfaceRoute(surfaces.get(node.surfaceId ?? ''));
  if (bySurface !== undefined) return bySurface;
  const byResource = resourceName(plan, node.resourceId);
  return byResource === undefined ? undefined : `/${byResource}`;
}

function toMenuItem(
  plan: ProductPlan,
  node: ProductNavigationNode,
  surfaces: ReadonlyMap<string, ProductSurface>,
  placements: readonly ProductMenuPlacement[],
): MenuItem | undefined {
  // Do not promote a visible child when its parent is hidden or filtered out.
  // Hidden parents represent an intentional product decision and their subtree
  // should not become orphaned sidebar entries.
  if (!node.visible || !placements.includes(node.placement)) return undefined;

  const children = node.children
    .map(child => toMenuItem(plan, child, surfaces, placements))
    .filter((child): child is MenuItem => child !== undefined);
  const href = menuHref(plan, node, surfaces);
  const targetResource = resourceName(plan, node.resourceId);
  const menuItem: MenuItem = {
    name: node.id,
    ...(node.label.length > 0 ? { label: node.label } : {}),
    ...(node.icon !== undefined ? { icon: node.icon } : {}),
    ...(href !== undefined ? { href } : {}),
    ...(targetResource !== undefined ? { meta: { resource: targetResource } } : {}),
    ...(children.length > 0 ? { children } : {}),
  };
  return menuItem;
}

/**
 * Adapts product navigation metadata to the core MenuItem contract used by
 * AdminApp, Lite and the sidebar. Role and feature filtering happen before
 * conversion, and only requested placements become persistent menu items.
 */
export function buildProductMenuItems(
  plan: ProductPlan,
  context: ProductNavigationContext,
  options: ProductMenuOptions = {},
): MenuItem[] {
  const placements = options.includePlacements ?? DEFAULT_MENU_PLACEMENTS;
  const surfaces = new Map(plan.surfaces.map(surface => [surface.id, surface] as const));
  return buildProductNavigation(plan, context)
    .map(node => toMenuItem(plan, node, surfaces, placements))
    .filter((item): item is MenuItem => item !== undefined);
}
