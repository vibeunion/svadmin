/**
 * Product decisions used by svadmin generation.
 *
 * Resource, surface, action and menu are intentionally separate concepts.
 * A backend resource may be contextual data without becoming a page or menu item.
 */
export const PRODUCT_PLAN_SCHEMA_VERSION = 'product/v1' as const;

export type ProductId = string;
export type ProductPriority = 'core' | 'secondary' | 'future';
export type ProductMenuPlacement = 'primary' | 'secondary' | 'settings' | 'context' | 'command' | 'hidden';
export type ProductPageKind = 'workbench' | 'list' | 'detail' | 'form' | 'approval' | 'import' | 'settings' | 'custom';
export type ProductDisclosure = 'visible' | 'collapsed' | 'more' | 'context' | 'hidden';
export type ProductFrequency = 'high' | 'medium' | 'low' | 'unknown';

export interface ProductBrief {
  readonly id: ProductId;
  readonly name: string;
  readonly description: string;
  readonly primaryOutcome: string;
  readonly primaryAudience: string;
  readonly constraints: readonly string[];
  readonly nonGoals: readonly string[];
  readonly assumptions: readonly string[];
}

export interface ProductRole {
  readonly id: ProductId;
  readonly name: string;
  readonly description?: string;
  readonly permissions: readonly string[];
}

export interface ProductWorkflow {
  readonly id: ProductId;
  readonly name: string;
  readonly actorRoleIds: readonly ProductId[];
  readonly trigger: string;
  readonly goal: string;
  readonly steps: readonly string[];
  readonly successCriteria: readonly string[];
  readonly exceptions: readonly string[];
  readonly priority: ProductPriority;
  readonly frequency: ProductFrequency;
}

export interface ProductField {
  readonly id: ProductId;
  readonly label: string;
  readonly type: string;
  readonly required?: boolean;
  readonly readableBy: readonly ProductId[];
  readonly writableBy: readonly ProductId[];
  readonly usedByWorkflowIds: readonly ProductId[];
  readonly disclosure?: ProductDisclosure;
  readonly sensitive?: boolean;
}

export interface ProductResource {
  readonly id: ProductId;
  readonly name: string;
  readonly label: string;
  readonly description?: string;
  readonly runtimeName?: string;
  readonly fields: readonly ProductField[];
  readonly menuPlacement?: ProductMenuPlacement;
  readonly roleIds: readonly ProductId[];
  readonly workflowIds: readonly ProductId[];
  readonly internal?: boolean;
}

export interface ProductAction {
  readonly id: ProductId;
  readonly label: string;
  readonly description?: string;
  readonly workflowId: ProductId;
  readonly roleIds: readonly ProductId[];
  readonly disclosure?: ProductDisclosure;
  readonly destructive?: boolean;
  readonly condition?: string;
}

export interface ProductSurface {
  readonly id: ProductId;
  readonly name: string;
  readonly kind: ProductPageKind;
  readonly purpose: string;
  readonly workflowIds: readonly ProductId[];
  readonly resourceIds: readonly ProductId[];
  readonly roleIds: readonly ProductId[];
  readonly menuPlacement?: ProductMenuPlacement;
  readonly parentSurfaceId?: ProductId;
  readonly primaryActionId?: ProductId;
  readonly actionIds: readonly ProductId[];
  readonly sections: readonly string[];
  readonly states: readonly ('empty' | 'loading' | 'error' | 'forbidden' | 'success')[];
}

export interface ProductMenuNode {
  readonly id: ProductId;
  readonly label: string;
  readonly icon?: string;
  readonly href?: string;
  readonly surfaceId?: ProductId;
  readonly resourceId?: ProductId;
  readonly workflowIds: readonly ProductId[];
  readonly roleIds: readonly ProductId[];
  readonly placement: ProductMenuPlacement;
  readonly parentId?: ProductId;
  readonly condition?: string;
  readonly order?: number;
}

export interface ProductPlan {
  readonly schemaVersion: typeof PRODUCT_PLAN_SCHEMA_VERSION;
  readonly brief: ProductBrief;
  readonly roles: readonly ProductRole[];
  readonly workflows: readonly ProductWorkflow[];
  readonly resources: readonly ProductResource[];
  readonly actions: readonly ProductAction[];
  readonly surfaces: readonly ProductSurface[];
  readonly menu: readonly ProductMenuNode[];
}

export interface ProductPlanValidationIssue {
  readonly code: 'invalid-root' | 'invalid-version' | 'missing-array' | 'invalid-id' | 'invalid-field' | 'duplicate-id';
  readonly path: string;
  readonly message: string;
}

export type ProductPlanValidationResult =
  | { readonly ok: true; readonly value: ProductPlan }
  | { readonly ok: false; readonly issues: readonly ProductPlanValidationIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStringId(value: unknown): value is { readonly id: string } {
  return isRecord(value) && typeof value['id'] === 'string' && value['id'].trim().length > 0;
}

interface EntityShape {
  readonly strings?: readonly string[];
  readonly arrays?: readonly string[];
}

function pushEntityIssues(
  issues: ProductPlanValidationIssue[],
  value: unknown,
  path: string,
  seen: Set<string>,
  shape: EntityShape = {},
): void {
  if (!Array.isArray(value)) {
    issues.push({ code: 'missing-array', path, message: `${path} must be an array.` });
    return;
  }
  value.forEach((item, index) => {
    const itemPath = `${path}.${index}`;
    if (!hasStringId(item)) {
      issues.push({ code: 'invalid-id', path: `${itemPath}.id`, message: 'Every product entity needs a non-empty string id.' });
      return;
    }
    if (seen.has(item.id)) {
      issues.push({ code: 'duplicate-id', path: `${itemPath}.id`, message: `Product id "${item.id}" is duplicated.` });
    }
    seen.add(item.id);
    const record: Record<string, unknown> | undefined = isRecord(item) ? item : undefined;
    if (!record) return;
    for (const key of shape.strings ?? []) {
      if (typeof record[key] !== 'string') issues.push({ code: 'invalid-field', path: `${itemPath}.${key}`, message: `${itemPath}.${key} must be a string.` });
    }
    for (const key of shape.arrays ?? []) {
      const candidate = record[key];
      if (!Array.isArray(candidate) || !candidate.every(value => typeof value === 'string')) {
        issues.push({ code: 'invalid-field', path: `${itemPath}.${key}`, message: `${itemPath}.${key} must be an array of strings.` });
      }
    }
  });
}

/** Validates the JSON boundary before review or generation consumes a plan. */
export function validateProductPlan(input: unknown): ProductPlanValidationResult {
  const issues: ProductPlanValidationIssue[] = [];
  if (!isRecord(input)) return { ok: false, issues: [{ code: 'invalid-root', path: '', message: 'Product plan must be a JSON object.' }] };
  if (input['schemaVersion'] !== PRODUCT_PLAN_SCHEMA_VERSION) {
    issues.push({ code: 'invalid-version', path: 'schemaVersion', message: `Expected ${PRODUCT_PLAN_SCHEMA_VERSION}.` });
  }
  if (!isRecord(input['brief'])) {
    issues.push({ code: 'invalid-root', path: 'brief', message: 'Product plan brief must be an object.' });
  } else {
    const brief = input['brief'] as Record<string, unknown>;
    for (const key of ['id', 'name', 'description', 'primaryOutcome', 'primaryAudience'] as const) {
      if (typeof brief[key] !== 'string') issues.push({ code: 'invalid-field', path: `brief.${key}`, message: `brief.${key} must be a string.` });
    }
    for (const key of ['constraints', 'nonGoals', 'assumptions'] as const) {
      const candidate = brief[key];
      if (!Array.isArray(candidate) || !candidate.every((value: unknown) => typeof value === 'string')) issues.push({ code: 'invalid-field', path: `brief.${key}`, message: `brief.${key} must be an array of strings.` });
    }
  }
  const shapes: Record<string, EntityShape> = {
    roles: { strings: ['name'], arrays: ['permissions'] },
    workflows: { strings: ['name', 'trigger', 'goal', 'priority', 'frequency'], arrays: ['actorRoleIds', 'steps', 'successCriteria', 'exceptions'] },
    resources: { strings: ['name', 'label'], arrays: ['fields', 'roleIds', 'workflowIds'] },
    actions: { strings: ['label', 'workflowId'], arrays: ['roleIds'] },
    surfaces: { strings: ['name', 'kind', 'purpose'], arrays: ['workflowIds', 'resourceIds', 'roleIds', 'actionIds', 'sections', 'states'] },
    menu: { strings: ['label', 'placement'], arrays: ['workflowIds', 'roleIds'] },
  };
  for (const key of ['roles', 'workflows', 'resources', 'actions', 'surfaces', 'menu'] as const) {
    // IDs are scoped to their entity collection. Cross-entity references are
    // explicit (for example resourceIds and workflowIds), so a menu entry may
    // intentionally share a label-like ID with its target resource or surface.
    pushEntityIssues(issues, input[key], key, new Set<string>(), shapes[key]);
  }
  return issues.length === 0
    ? { ok: true, value: input as unknown as ProductPlan }
    : { ok: false, issues };
}

export class ProductPlanValidationError extends Error {
  readonly issues: readonly ProductPlanValidationIssue[];

  constructor(issues: readonly ProductPlanValidationIssue[]) {
    super(`Invalid product plan (${issues.length} issue${issues.length === 1 ? '' : 's'})`);
    this.name = 'ProductPlanValidationError';
    this.issues = issues;
  }
}

export function parseProductPlan(input: unknown): ProductPlan {
  const result = validateProductPlan(input);
  if (!result.ok) throw new ProductPlanValidationError(result.issues);
  return result.value;
}

export interface ProductNavigationNode extends ProductMenuNode {
  readonly children: readonly ProductNavigationNode[];
  readonly visible: boolean;
  readonly reason?: string;
}
