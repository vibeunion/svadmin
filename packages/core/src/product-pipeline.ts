import type { ProductNavigationNode, ProductPlan } from './product-plan';
import { buildProductNavigation, type ProductNavigationContext } from './product-navigation';
import { buildProductPagePlan, type ProductPagePlan } from './product-pages';
import { reviewProductPlan, type ProductReviewReport } from './product-review';

export interface ProductPipelineInput {
  readonly plan: ProductPlan;
  readonly navigation: ProductNavigationContext;
  readonly surfaceIds?: readonly string[];
}

export interface ProductPipelineOutput {
  readonly navigation: readonly ProductNavigationNode[];
  readonly pages: readonly ProductPagePlan[];
  readonly productReview: ProductReviewReport;
}

export function runProductPipeline(input: ProductPipelineInput): ProductPipelineOutput {
  const navigation = buildProductNavigation(input.plan, input.navigation);
  const visibleSurfaceIds = input.surfaceIds === undefined
    ? undefined
    : new Set(input.surfaceIds);
  const pages = input.plan.surfaces
    .filter(surface => visibleSurfaceIds === undefined || visibleSurfaceIds.has(surface.id))
    .filter(surface => surface.roleIds.length === 0 || surface.roleIds.some(roleId => input.navigation.roleIds.includes(roleId)))
    .map(surface => buildProductPagePlan(surface, input.plan));
  return { navigation, pages, productReview: reviewProductPlan(input.plan) };
}

export function formatProductPreview(output: ProductPipelineOutput): string {
  const lines = ['Navigation:'];
  for (const node of output.navigation) {
    // A hidden parent owns its subtree; do not promote role-filtered children
    // into a misleading top-level preview entry.
    if (!node.visible) continue;
    lines.push(`- ${node.label}`);
    for (const child of node.children) if (child.visible) lines.push(`  - ${child.label}`);
  }
  lines.push('', 'Pages:');
  output.pages.forEach(page => lines.push(`- ${page.title}: ${page.purpose}`));
  lines.push('', `Product review: ${output.productReview.ok ? 'pass' : 'fail'}`);
  return lines.join('\n');
}
