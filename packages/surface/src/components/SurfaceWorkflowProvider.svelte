<script lang="ts">
  import { setContext, type Snippet } from 'svelte';
  import { SURFACE_WORKFLOW_CONTEXT, type SurfaceWorkflowHost } from '../workflows/context.js';
  import type { SurfaceActionDescriptor, SurfaceActionProposal } from '../workflows/types.js';
  import type { SurfaceWorkflowTransport } from '../workflows/client.js';
  let { actions, transport, scopeKey, surfaceId, revision, enabled = false, onCommitted, children }: {
    actions: readonly SurfaceActionDescriptor[]; transport: SurfaceWorkflowTransport;
    scopeKey: string; surfaceId: string; revision: number;
    /** Opt-in only after a complete validated surface is explicitly accepted. */
    enabled?: boolean; onCommitted?: (proposal: SurfaceActionProposal) => void; children: Snippet;
  } = $props();
  const host: SurfaceWorkflowHost = {
    getScope: () => ({ transport, scopeKey, surfaceId, revision, enabled }),
    getAction: (id) => actions.find((action) => action.id === id),
    committed: (proposal) => onCommitted?.(proposal),
  };
  setContext(SURFACE_WORKFLOW_CONTEXT, host);
</script>

{#key scopeKey}
  {@render children()}
{/key}
