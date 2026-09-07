<script lang="ts">
  import Message from './Message.svelte';
  import MessageContent from './MessageContent.svelte';
  import MessageActions from './MessageActions.svelte';
  import MessageToolbar from './MessageToolbar.svelte';
  import Response from './Response.svelte';
  import Tool from './Tool.svelte';
  import ToolHeader from './tool/ToolHeader.svelte';
  import ToolContent from './tool/ToolContent.svelte';
  import ToolInput from './tool/ToolInput.svelte';
  import ToolOutput from './tool/ToolOutput.svelte';

  const long = 'long_content_value_'.repeat(60);
  let content = $state(`${long}\n\n\`\`\`html\n<div>${long}</div>\n\`\`\`\n\n| ${long} | ${long} |\n| --- | --- |\n| ${long} | ${long} |`);
  let streaming = $state(false);
  let changes = $state(0);
  let approved = $state(false);
</script>

<main class="svadmin-ai">
  <Message from="assistant">
    <MessageContent>
      <Response {content} {streaming} />
      <Tool data-testid="default" name={long} input={{ long }} output={long} onOpenChange={() => changes++} />
      <Tool data-testid="compound" name={long} state="output-error" errorText={long} input={{ long }} open>
        <ToolHeader />
        <ToolContent><ToolInput /><ToolOutput /></ToolContent>
      </Tool>
      <Tool data-testid="approval" name="Approval" state="approval-requested" open onapprove={() => approved = true} />
    </MessageContent>
    <MessageActions><button type="button">Copy message</button><button type="button">Retry response</button></MessageActions>
    <MessageToolbar><span>{long}</span><button type="button">More</button></MessageToolbar>
  </Message>
  <Message from="user"><MessageContent>{long}</MessageContent></Message>
  <output data-testid="changes">{changes}</output>
  <output data-testid="approved">{String(approved)}</output>
  <button type="button" onclick={() => { content = '````html\n```\n<div>streamed &amp;</div>'; streaming = true; }}>Stream code</button>
  <button type="button" onclick={() => { content += '\n```\n````'; streaming = false; }}>Complete code</button>
</main>

<style>
  main { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; width: 100%; max-width: 64rem; margin: auto; padding: 1rem; }
  :global(body) { margin: 0; }
  :global(button) { font: inherit; }
</style>
