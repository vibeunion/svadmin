import type { ComponentProps } from 'svelte';
import type SvarDataGrid from '@svadmin/ui/components/SvarDataGrid.svelte';

export const SVAR_SURFACE_CONTEXT = Symbol('svadmin.surface.svar');
export interface SvarSurfaceContext {
  readonly Grid: ComponentProps<typeof SvarDataGrid>['Grid'];
  readonly Theme: ComponentProps<typeof SvarDataGrid>['Theme'];
  /** 非敏感的宿主作用域版本；不会写入 Surface spec。 */
  readonly scopeKey: string | number;
}
