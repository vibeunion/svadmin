<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
  import { Action, Actions } from './action/index.js';
  import * as Code from './code/index.js';
  import * as Message from './message/index.js';
  import * as PromptInput from './prompt-input/index.js';

  let messageRemoved = $state(false);
  let promptAttachments = $state([
    { id: 'prompt-file', name: 'report.pdf', mediaType: 'application/pdf', url: 'https://example.test/report.pdf' },
  ]);
  let collapsed = $state(true);
</script>

<Actions data-testid="generic-actions">
  <Action tooltip="Delete item" variant="destructive" data-testid="generic-action"><Trash2 size={14} /></Action>
</Actions>

<Message.Root from="user">
  <Message.Attachments>
    <Message.Attachment
      data={{ id: 'message-image', filename: 'diagram.png', mediaType: 'image/png', url: 'https://example.test/diagram.png' }}
      onRemove={() => messageRemoved = true}
    />
  </Message.Attachments>
</Message.Root>
<output data-testid="message-removed">{messageRemoved}</output>

<PromptInput.Root attachments={promptAttachments} onsubmit={() => undefined}>
  <PromptInput.Attachments>
    {#snippet children(file)}
      <PromptInput.Attachment data={file} />
    {/snippet}
  </PromptInput.Attachments>
  <PromptInput.Textarea aria-label="Compatibility prompt" />
  <PromptInput.Toolbar><span>Toolbar content</span></PromptInput.Toolbar>
</PromptInput.Root>

<Code.Overflow bind:collapsed maxHeight={64}>
  <Code.Root code="const first = 1;\nconst second = 2;" lang="typescript" highlight={[2]} />
</Code.Overflow>
<output data-testid="code-collapsed">{collapsed}</output>
