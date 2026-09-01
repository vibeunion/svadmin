<script lang="ts">
  import type { QuestionResponse } from './context.svelte.js';
  import AgentTool from '../agent/AgentTool.svelte';
  import ChainOfThought from '../chain-of-thought/ChainOfThought.svelte';
  import ChainOfThoughtContent from '../chain-of-thought/ChainOfThoughtContent.svelte';
  import ChainOfThoughtHeader from '../chain-of-thought/ChainOfThoughtHeader.svelte';
  import ChainOfThoughtStep from '../chain-of-thought/ChainOfThoughtStep.svelte';
  import CodeBlock from '../code-block/CodeBlock.svelte';
  import CodeBlockActions from '../code-block/CodeBlockActions.svelte';
  import CodeBlockCopyButton from '../code-block/CodeBlockCopyButton.svelte';
  import CodeBlockHeader from '../code-block/CodeBlockHeader.svelte';
  import CodeBlockLanguageSelector from '../code-block/CodeBlockLanguageSelector.svelte';
  import CodeBlockLanguageSelectorContent from '../code-block/CodeBlockLanguageSelectorContent.svelte';
  import CodeBlockLanguageSelectorItem from '../code-block/CodeBlockLanguageSelectorItem.svelte';
  import CodeBlockLanguageSelectorTrigger from '../code-block/CodeBlockLanguageSelectorTrigger.svelte';
  import CommitCopyButton from '../commit/CommitCopyButton.svelte';
  import EnvironmentVariable from '../environment-variables/EnvironmentVariable.svelte';
  import EnvironmentVariableCopyButton from '../environment-variables/EnvironmentVariableCopyButton.svelte';
  import EnvironmentVariableGroup from '../environment-variables/EnvironmentVariableGroup.svelte';
  import EnvironmentVariableName from '../environment-variables/EnvironmentVariableName.svelte';
  import EnvironmentVariableValue from '../environment-variables/EnvironmentVariableValue.svelte';
  import EnvironmentVariables from '../environment-variables/EnvironmentVariables.svelte';
  import EnvironmentVariablesToggle from '../environment-variables/EnvironmentVariablesToggle.svelte';
  import OpenIn from '../open-in-chat/OpenIn.svelte';
  import OpenInChatGPT from '../open-in-chat/OpenInChatGPT.svelte';
  import OpenInContent from '../open-in-chat/OpenInContent.svelte';
  import OpenInItem from '../open-in-chat/OpenInItem.svelte';
  import OpenInTrigger from '../open-in-chat/OpenInTrigger.svelte';
  import Sandbox from '../sandbox/Sandbox.svelte';
  import SandboxContent from '../sandbox/SandboxContent.svelte';
  import SandboxHeader from '../sandbox/SandboxHeader.svelte';
  import SandboxTabContent from '../sandbox/SandboxTabContent.svelte';
  import SandboxTabs from '../sandbox/SandboxTabs.svelte';
  import SandboxTabsList from '../sandbox/SandboxTabsList.svelte';
  import SandboxTabsTrigger from '../sandbox/SandboxTabsTrigger.svelte';
  import Question from './Question.svelte';
  import QuestionActions from './QuestionActions.svelte';
  import QuestionInput from './QuestionInput.svelte';
  import QuestionOption from './QuestionOption.svelte';
  import QuestionOptions from './QuestionOptions.svelte';
  import QuestionSubmit from './QuestionSubmit.svelte';

  let {
    onquestionsubmit,
    oncodecopy,
    oncommitcopy,
    onenvcopy,
  }: {
    onquestionsubmit?: (response: QuestionResponse) => void | Promise<void>;
    oncodecopy?: () => void;
    oncommitcopy?: () => void;
    onenvcopy?: () => void;
  } = $props();

  const sampleCode = 'const answer = 42;\nreturn answer;';
  let language = $state('typescript');
</script>

<CodeBlock code={sampleCode} {language} showLineNumbers>
  <CodeBlockHeader>
    <CodeBlockLanguageSelector bind:value={language}>
      <CodeBlockLanguageSelectorTrigger aria-label="Choose code language" />
      <CodeBlockLanguageSelectorContent>
        <CodeBlockLanguageSelectorItem value="typescript">TypeScript</CodeBlockLanguageSelectorItem>
        <CodeBlockLanguageSelectorItem value="javascript">JavaScript</CodeBlockLanguageSelectorItem>
      </CodeBlockLanguageSelectorContent>
    </CodeBlockLanguageSelector>
    <CodeBlockActions><CodeBlockCopyButton oncopy={oncodecopy} /></CodeBlockActions>
  </CodeBlockHeader>
</CodeBlock>
<output data-testid="language">{language}</output>

<ChainOfThought>
  <ChainOfThoughtHeader />
  <ChainOfThoughtContent><ChainOfThoughtStep label="Inspect schemas" status="active" /></ChainOfThoughtContent>
</ChainOfThought>

<AgentTool tool={{ description: 'Search the web', inputSchema: { query: { type: 'string' } } }} value="search" />
<CommitCopyButton hash="abc123" oncopy={oncommitcopy} />

<EnvironmentVariables>
  <EnvironmentVariablesToggle />
  <EnvironmentVariable name="SECRET" value="top-secret">
    <EnvironmentVariableGroup><EnvironmentVariableName /><EnvironmentVariableValue /></EnvironmentVariableGroup>
    <EnvironmentVariableCopyButton copyFormat="export" oncopy={onenvcopy} />
  </EnvironmentVariable>
</EnvironmentVariables>

<OpenIn query="hello & world">
  <OpenInTrigger />
  <OpenInContent>
    <OpenInChatGPT />
    <OpenInItem href="javascript:alert(1)" label="Unsafe" />
  </OpenInContent>
</OpenIn>

<Sandbox defaultOpen>
  <SandboxHeader title="Run" state="output-available" />
  <SandboxContent>
    <SandboxTabs defaultValue="logs">
      <SandboxTabsList>
        <SandboxTabsTrigger value="logs">Logs</SandboxTabsTrigger>
        <SandboxTabsTrigger value="result">Result</SandboxTabsTrigger>
      </SandboxTabsList>
      <SandboxTabContent value="logs">Log output</SandboxTabContent>
      <SandboxTabContent value="result">Result output</SandboxTabContent>
    </SandboxTabs>
  </SandboxContent>
</Sandbox>

<Question selectionMode="multiple" onsubmit={(response) => onquestionsubmit?.(response)}>
  <QuestionOptions>
    <QuestionOption value="alpha">Alpha</QuestionOption>
    <QuestionOption value="beta">Beta</QuestionOption>
  </QuestionOptions>
  <QuestionInput aria-label="Question details" />
  <QuestionActions><QuestionSubmit /></QuestionActions>
</Question>
