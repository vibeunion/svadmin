// DOM-free contracts: no server implementation or Svelte components in this entry.
export { createInteractiveSurfaceDefinitions, withSurfaceAppearance, surfaceAppearanceSchema } from './workflows/catalog.js';
export { createSurfaceFormController } from './workflows/client.js';
export type { SurfaceWorkflowTransport, SurfaceWorkflowClientScope, SurfaceWorkflowClientState } from './workflows/client.js';
export type { SurfaceActionDescriptor, SurfaceActionProposal, SurfaceApprovalPolicy } from './workflows/types.js';
export { defaultSurfaceDefinitions, styledSurfaceDefinitions } from './builtin-definitions.js';
