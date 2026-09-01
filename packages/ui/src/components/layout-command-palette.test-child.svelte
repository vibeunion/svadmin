<script lang="ts">
  let {
    onAskAI,
  }: {
    onAskAI?: (query: string) => void;
  } = $props();
</script>

<output data-testid="layout-command-ai-state">{onAskAI ? 'enabled' : 'disabled'}</output>
<button type="button" data-testid="layout-command-ask-ai" onclick={() => onAskAI?.('scoped question')}>
  Ask AI
</button>
