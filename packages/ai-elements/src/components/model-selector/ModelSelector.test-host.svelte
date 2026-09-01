<script lang="ts">
  import ModelSelector from './ModelSelector.svelte';
  import ModelSelectorContent from './ModelSelectorContent.svelte';
  import ModelSelectorEmpty from './ModelSelectorEmpty.svelte';
  import ModelSelectorGroup from './ModelSelectorGroup.svelte';
  import ModelSelectorInput from './ModelSelectorInput.svelte';
  import ModelSelectorItem from './ModelSelectorItem.svelte';
  import ModelSelectorList from './ModelSelectorList.svelte';
  import ModelSelectorLogo from './ModelSelectorLogo.svelte';
  import ModelSelectorLogoGroup from './ModelSelectorLogoGroup.svelte';
  import ModelSelectorName from './ModelSelectorName.svelte';
  import ModelSelectorSeparator from './ModelSelectorSeparator.svelte';
  import ModelSelectorShortcut from './ModelSelectorShortcut.svelte';
  import ModelSelectorTrigger from './ModelSelectorTrigger.svelte';

  let selectedId = $state('gpt-4o');
  let compoundValue = $state('gpt-4o');
</script>

<output aria-label="Data model value">{selectedId}</output>
<ModelSelector
  options={[
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'Anthropic' },
    { id: 'disabled', name: 'Disabled model', disabled: true },
  ]}
  bind:selectedId
  label="Data model"
/>

<output aria-label="Compound model value">{compoundValue}</output>
<ModelSelector bind:selectedId={compoundValue}>
  <ModelSelectorTrigger>Choose compound model</ModelSelectorTrigger>
  <ModelSelectorContent title="Compound models">
    <ModelSelectorInput placeholder="Find a model" />
    <ModelSelectorList aria-label="Compound models">
      <ModelSelectorEmpty>No matching compound models</ModelSelectorEmpty>
      <ModelSelectorGroup heading="OpenAI">
        <ModelSelectorItem value="gpt-4o" text="GPT-4o OpenAI">
          <ModelSelectorLogo provider="openai" />
          <ModelSelectorName>GPT-4o</ModelSelectorName>
          <ModelSelectorShortcut>⌘1</ModelSelectorShortcut>
        </ModelSelectorItem>
      </ModelSelectorGroup>
      <ModelSelectorSeparator />
      <ModelSelectorGroup heading="Anthropic">
        <ModelSelectorItem value="claude-sonnet" text="Claude Sonnet Anthropic">
          <ModelSelectorName>Claude Sonnet</ModelSelectorName>
          <ModelSelectorLogoGroup>
            <ModelSelectorLogo provider="anthropic" />
            <ModelSelectorLogo provider="amazon-bedrock" />
          </ModelSelectorLogoGroup>
        </ModelSelectorItem>
      </ModelSelectorGroup>
    </ModelSelectorList>
  </ModelSelectorContent>
</ModelSelector>
