import type { ProductAction, ProductPlan, ProductSurface } from './product-plan';

export interface ProductPageSection {
  readonly id: string;
  readonly title: string;
  readonly resourceIds: readonly string[];
}

export interface ProductPagePlan {
  readonly id: string;
  readonly kind: ProductSurface['kind'];
  readonly title: string;
  readonly purpose: string;
  readonly workflowIds: readonly string[];
  readonly roleIds: readonly string[];
  readonly primaryAction?: ProductAction;
  readonly secondaryActions: readonly ProductAction[];
  readonly sections: readonly ProductPageSection[];
  readonly states: ProductSurface['states'];
}

/** Generates a small, renderer-neutral page plan for Svelte components. */
export function buildProductPagePlan(surface: ProductSurface, plan: ProductPlan): ProductPagePlan {
  const actionById = new Map(plan.actions.map(action => [action.id, action]));
  const primaryAction = surface.primaryActionId === undefined ? undefined : actionById.get(surface.primaryActionId);
  const secondaryActions = surface.actionIds
    .filter(id => id !== surface.primaryActionId)
    .map(id => actionById.get(id))
    .filter((action): action is ProductAction => action !== undefined);
  // ProductSurface currently declares section titles separately from its
  // resource list. Keep resource declarations in one section until the plan
  // schema can express per-section ownership; repeating every resource in
  // every section makes generated pages look like duplicate data.
  const sections = surface.sections.length
    ? surface.sections.map((title, index) => ({
      id: `${surface.id}.section.${index + 1}`,
      title,
      resourceIds: index === 0 ? surface.resourceIds : [],
    }))
    : [{ id: `${surface.id}.content`, title: surface.name, resourceIds: surface.resourceIds }];
  return {
    id: surface.id,
    kind: surface.kind,
    title: surface.name,
    purpose: surface.purpose,
    workflowIds: surface.workflowIds,
    roleIds: surface.roleIds,
    ...(primaryAction === undefined ? {} : { primaryAction }),
    secondaryActions,
    sections,
    states: surface.states,
  };
}
