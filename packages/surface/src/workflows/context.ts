import { getContext } from 'svelte';
import type { SurfaceActionDescriptor, SurfaceActionProposal } from './types.js';
import type { SurfaceWorkflowClientScope } from './client.js';
export const SURFACE_WORKFLOW_CONTEXT = Symbol('svadmin.surface.workflow');
export interface SurfaceWorkflowHost {
  getScope(): SurfaceWorkflowClientScope;
  getAction(id: string): SurfaceActionDescriptor | undefined;
  committed(proposal: SurfaceActionProposal): void;
}
export function getSurfaceWorkflowHost(): SurfaceWorkflowHost | undefined {
  return getContext<SurfaceWorkflowHost | undefined>(SURFACE_WORKFLOW_CONTEXT);
}
