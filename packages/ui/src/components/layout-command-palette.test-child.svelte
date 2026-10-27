<script lang="ts">
  let {
    onAskAI,
    open = false,
  }: {
    onAskAI?: (query: string) => void;
    open?: boolean;
  } = $props();
</script>

<output data-testid="layout-command-open">{open ? 'open' : 'closed'}</output>

<output data-testid="layout-command-ai-state">{onAskAI ? 'enabled' : 'disabled'}</output>
<button type="button" data-testid="layout-command-ask-ai" onclick={() => onAskAI?.('scoped question')}>
  Ask AI
</button>
