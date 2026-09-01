<script lang="ts">
  import type { ChatMessage } from '../contracts.js';
  import * as Confirmation from './confirmation/index.js';
  import * as Conversation from './conversation/index.js';
  import * as Message from './message/index.js';
  import * as Reasoning from './reasoning/index.js';
  import * as Sources from './sources/index.js';
  import * as Tool from './tool/index.js';

  let currentBranch = $state(0);
  const messages: ChatMessage[] = [
    {
      id: 'assistant-1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Structured response' }],
      status: 'complete',
      createdAt: 1,
    },
  ];

  let { ondownload }: { ondownload?: (markdown: string) => void } = $props();
</script>

<Confirmation.Root state="approval-requested" approval={{ id: 'approval-1' }}>
  <Confirmation.Title>Run the migration?</Confirmation.Title>
  <Confirmation.Request><p>Approval is pending.</p></Confirmation.Request>
  <Confirmation.Accepted><p>Approved.</p></Confirmation.Accepted>
  <Confirmation.Actions>
    <Confirmation.Action>Approve</Confirmation.Action>
  </Confirmation.Actions>
</Confirmation.Root>

<Reasoning.Root isStreaming={true} open={true}>
  <Reasoning.Trigger />
  <Reasoning.Content text="Inspecting the schema." />
</Reasoning.Root>

<Sources.Root sources={[{ id: 'docs', title: 'Docs', url: 'https://example.test/docs' }]} open={true}>
  <Sources.Trigger />
  <Sources.Content>
    <Sources.Source href="https://example.test/docs" title="Docs" />
    <Sources.Source href="javascript:alert(1)" title="Unsafe" />
  </Sources.Content>
</Sources.Root>

<Tool.Root name="lookup" input={{ id: 42 }} output={{ found: true }} state="output-available" open={true}>
  <Tool.Header />
  <Tool.Content>
    <Tool.Input />
    <Tool.Output />
  </Tool.Content>
</Tool.Root>

<Message.Branch bind:currentBranch total={2}>
  <Message.BranchContent count={2}>
    {#snippet children(branch)}
      <p>Branch {branch + 1}</p>
    {/snippet}
  </Message.BranchContent>
  <Message.BranchSelector>
    <Message.BranchPrevious />
    <Message.BranchPage />
    <Message.BranchNext />
  </Message.BranchSelector>
</Message.Branch>

<Conversation.Download {messages} {ondownload} />
