<script lang="ts">
  import * as Context from './context/index.js';
  import * as FileTree from './file-tree/index.js';
  import * as Sandbox from './sandbox/index.js';
  import * as StackTrace from './stack-trace/index.js';
  import * as Terminal from './terminal/index.js';
  import * as Transcription from './transcription/index.js';

  let {
    oncontextopenchange,
    onfileexpandedchange,
    onfileselect,
    onterminalclear,
  }: {
    oncontextopenchange?: (open: boolean) => void;
    onfileexpandedchange?: (expanded: ReadonlySet<string>) => void;
    onfileselect?: (path: string) => void;
    onterminalclear?: () => void;
  } = $props();

  const stack = 'TypeError: exploded\n    at run (/workspace/app.ts:12:8)';
  const ansiOutput = '\u001b[32mGreen output\u001b[0m';
  const transcriptSegments = [
    { text: 'Opening segment', startSecond: 0, endSecond: 3 },
    { text: '   ', startSecond: 1, endSecond: 1.25 },
    { text: 'Overlapping segment', startSecond: 1, endSecond: 2 },
  ];

</script>

{#snippet customFileIcon()}
  <span data-testid="custom-file-icon">TS</span>
{/snippet}

<Terminal.Root data-testid="passive-terminal" output={ansiOutput} />
<Terminal.Root data-testid="interactive-terminal" output="Ready" oncommand={() => undefined} onclear={onterminalclear} />

<StackTrace.Root data-testid="stack-root" aria-label="Application stack" trace={stack}>
  <StackTrace.Header data-testid="stack-header">
    <StackTrace.Error>
      <StackTrace.ErrorType />
      <StackTrace.ErrorMessage />
    </StackTrace.Error>
    <StackTrace.Actions>
      <StackTrace.CopyButton />
    </StackTrace.Actions>
    <StackTrace.ExpandButton />
  </StackTrace.Header>
  <StackTrace.Content><StackTrace.Frames /></StackTrace.Content>
</StackTrace.Root>

<Sandbox.Root>
  <Sandbox.Header title="Code sandbox" state="output-available" />
  <Sandbox.Content>
    <Sandbox.Tabs defaultValue="code">
      <Sandbox.TabsBar>
        <Sandbox.TabsList aria-label="Sandbox views">
          <Sandbox.TabsTrigger value="code">Code</Sandbox.TabsTrigger>
          <Sandbox.TabsTrigger value="output">Output</Sandbox.TabsTrigger>
        </Sandbox.TabsList>
      </Sandbox.TabsBar>
      <Sandbox.TabContent value="code">Code panel</Sandbox.TabContent>
      <Sandbox.TabContent value="output">Output panel</Sandbox.TabContent>
    </Sandbox.Tabs>
  </Sandbox.Content>
</Sandbox.Root>

<FileTree.Root
  aria-label="Source files"
  data-testid="compound-file-tree"
  defaultExpanded={new Set(['src'])}
  onExpandedChange={onfileexpandedchange}
  onSelect={onfileselect}
>
  <FileTree.Folder path="src" name="src">
    <FileTree.File path="src/index.ts" name="index.ts" icon={customFileIcon} />
  </FileTree.Folder>
</FileTree.Root>

<Context.Root
  aria-label="Model context"
  data-testid="context-root"
  usedTokens={50}
  maxTokens={100}
  onopenchange={oncontextopenchange}
>
  <Context.Trigger>Context trigger</Context.Trigger>
  <Context.Content>Context details</Context.Content>
</Context.Root>

<Transcription.Root
  aria-label="Compound transcript"
  data-testid="compound-transcript"
  segments={transcriptSegments}
  currentTime={1.5}
>
  {#snippet children(segment, index)}
    <Transcription.Segment {segment} {index} />
  {/snippet}
</Transcription.Root>

<Transcription.Root title="No-id transcript" segments={transcriptSegments} currentTime={1.5} />
