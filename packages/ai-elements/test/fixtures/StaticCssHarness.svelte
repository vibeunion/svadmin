<script lang="ts">
  import Conversation from '../../src/components/Conversation.svelte';
  import Message from '../../src/components/Message.svelte';
  import MessageContent from '../../src/components/MessageContent.svelte';
  import Response from '../../src/components/Response.svelte';
  import PromptInput from '../../src/components/prompt-input/PromptInput.svelte';
  import Canvas from '../../src/components/canvas/Canvas.svelte';
  import { codeVariants } from '../../src/components/code/code-variants.js';

  let prompt = $state('');
  let streaming = $state(false);
  let submitted = $state('');
  const markdown = '## Review summary\n\n- Inspect the **layout**\n- Preserve host styles\n\n> Waiting for approval\n\n```text\n' + 'very_long_output_'.repeat(28) + '\n```\n\n| Item | State |\n| --- | --- |\n| Styles | Ready |';
</script>

<main>
  <h1>Assistant</h1>
  <Conversation isStreaming={streaming} class="conversation-fixture">
    <Message from="user"><MessageContent>Review the pending changes.</MessageContent></Message>
    <Message from="assistant"><MessageContent><Response content={markdown} {streaming} /></MessageContent></Message>
  </Conversation>
  <PromptInput
    bind:value={prompt}
    status={streaming ? 'streaming' : 'ready'}
    onsubmit={() => { submitted = prompt; streaming = true; }}
    onstop={() => { streaming = false; }}
  />
  <output data-testid="submitted">{submitted}</output>
  <div class={codeVariants({ variant: 'secondary', class: ['code-fixture', 'p-4'] })}>Code variant</div>
  <button class="svadmin-ai__button p-0 shadow-none" type="button" data-testid="override">Host override</button>
  <span class="svadmin-ai text-primary" data-testid="host-theme">Host theme</span>
  <div class="svadmin-theme" style="--primary: rgb(7, 8, 9)">
    <span class="text-primary" data-testid="nested-theme">Nested theme</span>
  </div>
  <div class="canvas-fixture"><Canvas nodes={[{ id: 'review', position: { x: 40, y: 30 }, data: { label: 'Review' } }]} /></div>
</main>

<style>
  main { display: grid; gap: 16px; max-width: 920px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 20px; margin: 0; }
  :global(.conversation-fixture) { padding: 16px; gap: 16px; }
  .canvas-fixture { height: 240px; min-width: 0; }
  :global(.code-fixture) { height: auto; }
</style>
