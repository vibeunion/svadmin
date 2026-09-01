<script lang="ts">
  import * as Context from '../context/index.js';
  import * as SchemaDisplay from '../schema-display/index.js';
  import * as StackTrace from '../stack-trace/index.js';
  import * as Terminal from '../terminal/index.js';
  import * as TestResults from '../test-results/index.js';
  import * as Transcription from '../transcription/index.js';
  import * as WebPreview from './index.js';

  let { onfilepathclick, onseek, onurlchange }: {
    onfilepathclick?: (filePath: string, line?: number, column?: number) => void;
    onseek?: (time: number) => void;
    onurlchange?: (url: string) => void;
  } = $props();

  const terminalCommand = async () => { throw new Error('permission denied'); };
  const stackTrace = 'TypeError: exploded\n    at run (/workspace/app.ts:12:8)';
  const transcriptSegments = [
    { id: 'one', text: 'First segment', startSecond: 0, endSecond: 2 },
    { id: 'two', text: 'Second segment', startSecond: 2, endSecond: 4 },
  ];
</script>

<Context.Root usedTokens={750} maxTokens={1000} usage={{ inputTokens: 500, reasoningTokens: 125 }} open={true}>
  <Context.Trigger />
  <Context.Content>
    <Context.ContentHeader />
    <Context.ContentBody><Context.InputUsage /><Context.ReasoningUsage /></Context.ContentBody>
  </Context.Content>
</Context.Root>

<SchemaDisplay.Root method="POST" path={'/users/{id}'} parameters={[{ name: 'id', type: 'string', required: true, location: 'path' }]}>
  <SchemaDisplay.Header><SchemaDisplay.Method /><SchemaDisplay.Path /></SchemaDisplay.Header>
  <SchemaDisplay.Content><SchemaDisplay.Parameters /></SchemaDisplay.Content>
</SchemaDisplay.Root>

<StackTrace.Root trace={stackTrace} open={true} {onfilepathclick}>
  <StackTrace.Header>
    <StackTrace.Error><StackTrace.ErrorType /><StackTrace.ErrorMessage /></StackTrace.Error>
    <StackTrace.ExpandButton />
  </StackTrace.Header>
  <StackTrace.Content><StackTrace.Frames /></StackTrace.Content>
</StackTrace.Root>

<Terminal.Root oncommand={terminalCommand} />

<TestResults.Root summary={{ passed: 2, failed: 1, skipped: 0, total: 3, duration: 1250 }}>
  <TestResults.Header><TestResults.Summary /><TestResults.Duration /></TestResults.Header>
  <TestResults.Content>
    <TestResults.Progress />
    <TestResults.Suite name="unit" status="failed" open={true}>
      <TestResults.SuiteName />
      <TestResults.SuiteContent>
        <TestResults.Test name="rejects invalid input" status="failed" duration={12}>
          <TestResults.Status /><TestResults.Name /><TestResults.TestDuration />
        </TestResults.Test>
      </TestResults.SuiteContent>
    </TestResults.Suite>
  </TestResults.Content>
</TestResults.Root>

<Transcription.Root segments={transcriptSegments} currentTime={2.5} {onseek}>
  {#snippet children(segment, index)}
    <Transcription.Segment {segment} {index} />
  {/snippet}
</Transcription.Root>

<WebPreview.Root defaultUrl="about:blank#one" title="Compound preview" {onurlchange}>
  <WebPreview.Navigation>
    <WebPreview.NavigationButton action="back" />
    <WebPreview.NavigationButton action="forward" />
    <WebPreview.NavigationButton action="reload" />
    <WebPreview.Url aria-label="Preview address" />
    <WebPreview.NavigationButton action="console" />
  </WebPreview.Navigation>
  <WebPreview.Body />
  <WebPreview.Console logs={[{ level: 'warn', message: 'Network is slow', timestamp: new Date('2026-09-01T00:00:00Z') }]} />
</WebPreview.Root>
