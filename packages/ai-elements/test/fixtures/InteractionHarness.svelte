<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { ChatProvider } from '../../src/contracts.js';
  import Conversation from '../../src/components/Conversation.svelte';
  import ConversationContent from '../../src/components/ConversationContent.svelte';
  import ConversationScrollButton from '../../src/components/ConversationScrollButton.svelte';
  import Message from '../../src/components/Message.svelte';
  import MessageContent from '../../src/components/MessageContent.svelte';
  import Response from '../../src/components/Response.svelte';
  import PromptInput from '../../src/components/prompt-input/PromptInput.svelte';
  import PromptInputTextarea from '../../src/components/prompt-input/PromptInputTextarea.svelte';
  import PromptInputSubmit from '../../src/components/prompt-input/PromptInputSubmit.svelte';
  import * as Tool from '../../src/components/tool/index.js';
  import ChatDialogHost from '../../src/components/chat-dialog.test-host.svelte';

  const code = `const payload = "${'long-value-'.repeat(45)}";`;
  const markdown = [
    '# Streamed result',
    'A response with **formatted text**, `inline code`, and a list:',
    '- First result\n- Second result',
    `| ${Array.from({ length: 32 }, (_, index) => `Column ${index}`).join(' | ')} |\n| ${Array(32).fill('---').join(' | ')} |\n| ${Array(32).fill('Table value').join(' | ')} |`,
    `\`\`\`\`markdown\n\`\`\`html\n<section>${code}</section>\n\`\`\`\n\`\`\`\``,
    `\`\`\`javascript\n${Array.from({ length: 24 }, (_, index) => `// Line ${index + 1}\n${code}`).join('\n')}\n\`\`\``,
  ].join('\n\n');
  let content = $state(markdown);
  let growing = $state(false);
  let extraHeight = $state(false);
  let composed = $state(true);
  let inputStatus = $state<'ready' | 'streaming'>('ready');
  let submits = $state(0);
  let stops = $state(0);
  let failNext = $state(true);
  let toolState = $state<'input-streaming' | 'input-available' | 'output-available' | 'output-error'>('input-streaming');
  let interval: ReturnType<typeof setInterval> | undefined;
  let chatCalls = 0;
  const chatProvider: ChatProvider = {
    sendMessage: () => {
      chatCalls += 1;
      const call = chatCalls;
      return (async function* () {
        yield 'Partial response.';
        await new Promise((resolve) => setTimeout(resolve, 450));
        if (call === 1) throw new Error('Simulated failure');
        for (let index = 0; index < 30; index += 1) {
          await new Promise((resolve) => setTimeout(resolve, 60));
          yield ` Chunk ${index + 1}.`;
        }
      })();
    },
  };

  function toggleStream(): void {
    clearInterval(interval);
    growing = !growing;
    if (growing) interval = setInterval(() => { content += '\n\nNew streamed paragraph.'; }, 80);
  }

  async function submit(): Promise<void> {
    submits += 1;
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (failNext) {
      failNext = false;
      throw new Error('Send failed. Retry the draft.');
    }
    inputStatus = 'streaming';
  }

  function stop(): void {
    stops += 1;
    inputStatus = 'ready';
  }

  onDestroy(() => clearInterval(interval));
</script>

<main class="harness">
  <header>
    <h1>Conversation</h1>
    <div class="controls">
      <button onclick={toggleStream}>{growing ? 'Pause stream' : 'Start stream'}</button>
      <button onclick={() => { extraHeight = !extraHeight; }}>Resize content</button>
      <button onclick={() => { composed = !composed; }}>{composed ? 'Use default input' : 'Use composed input'}</button>
      <button onclick={() => { toolState = toolState === 'input-streaming' ? 'input-available' : toolState === 'input-available' ? 'output-available' : 'output-error'; }}>Advance tool</button>
    </div>
  </header>
  <Conversation isStreaming={growing} class="conversation">
    <ConversationContent>
      {#each Array.from({ length: 12 }, (_, index) => index) as index (index)}
        <Message from={index % 2 ? 'assistant' : 'user'}>
          <MessageContent><p>Earlier message {index + 1}. {'A long message with readable content. '.repeat(8)}</p></MessageContent>
        </Message>
      {/each}
      <Message from="user"><MessageContent>{'unbroken-user-text-'.repeat(60)}</MessageContent></Message>
      <Message from="assistant">
        <MessageContent>
          <Response {content} streaming={growing} />
          <div data-testid="delayed-content" style:height={extraHeight ? '350px' : '20px'}>Delayed content</div>
          <Tool.Root name={'inspect_long_tool_name_'.repeat(12)} state={toolState} input={{ query: 'long-input-'.repeat(90) }} output={toolState === 'output-available' ? { result: 'long-result-'.repeat(90) } : undefined} errorText={toolState === 'output-error' ? 'Tool execution failed.' : undefined}>
            <Tool.Header />
            <Tool.Content><Tool.Input /><Tool.Output /></Tool.Content>
          </Tool.Root>
        </MessageContent>
      </Message>
    </ConversationContent>
    <ConversationScrollButton />
  </Conversation>
  <footer>
    {#if composed}
      <PromptInput onSubmit={submit} status={inputStatus} onstop={stop}>
        <PromptInputTextarea aria-label="Message" />
        <div class="submit-row"><PromptInputSubmit /></div>
      </PromptInput>
    {:else}
      <PromptInput onSubmit={submit} status={inputStatus} onstop={stop} ariaLabel="Message" />
    {/if}
    <output aria-label="Submission counts">{submits} sends, {stops} stops</output>
  </footer>
  <ChatDialogHost {chatProvider} docked />
</main>

<style>
  :global(body) { margin: 0; background: var(--background); color: var(--foreground); font-family: system-ui, sans-serif; }
  .harness { display: flex; flex-direction: column; width: min(100%, 60rem); height: 100dvh; margin: auto; box-sizing: border-box; padding: 1rem; gap: 0.75rem; }
  header, footer { flex: none; min-width: 0; }
  h1 { margin: 0 0 0.5rem; font-size: 1.25rem; }
  .controls { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  button { border: 1px solid var(--border); background: var(--secondary); color: var(--foreground); border-radius: 0.25rem; padding: 0.5rem; cursor: pointer; }
  :global(.conversation) { flex: 1; }
  .submit-row { display: flex; justify-content: flex-end; }
  output { display: block; margin-top: 0.25rem; font-size: 0.75rem; color: var(--muted-foreground); }
  @media (max-width: 480px) { .harness { padding: 0.5rem; } }
</style>
