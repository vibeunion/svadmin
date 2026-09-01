<script lang="ts">
  import Context from './context/Context.svelte';
  import ContextIcon from './context/ContextIcon.svelte';
  import TokensWithCost from './context/TokensWithCost.svelte';
  import ToolStatusBadge from './tool/ToolStatusBadge.svelte';
  import type { ToolDisplayState } from './tool/status.js';

  let { state = 'input-streaming' }: { state?: ToolDisplayState } = $props();
</script>

<Context usedTokens={75} maxTokens={100} open>
  <ContextIcon data-testid="context-icon" />
  <TokensWithCost data-testid="tokens-with-cost" tokens={1250} costText="$0.01" />
</Context>
<ToolStatusBadge {state} />
