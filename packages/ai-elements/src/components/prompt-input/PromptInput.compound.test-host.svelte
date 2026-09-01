<script lang="ts">
  import {
    PromptInput, PromptInputActionMenu, PromptInputActionMenuContent, PromptInputActionMenuItem,
    PromptInputActionMenuTrigger, PromptInputFooter, PromptInputSelect, PromptInputSelectContent,
    PromptInputSelectItem, PromptInputSelectTrigger, PromptInputSelectValue, PromptInputSubmit,
    PromptInputTextarea, PromptInputTools,
  } from './index.js';
  let submitted = $state(''); let model = $state('fast'); let action = $state('');
</script>

<output aria-label="Prompt result">{submitted}|{model}|{action}</output>
<PromptInput onSubmit={(message) => { submitted = message.text; }}>
  <PromptInputTextarea aria-label="Compound prompt" />
  <PromptInputFooter>
    <PromptInputTools>
      <PromptInputActionMenu>
        <PromptInputActionMenuTrigger aria-label="Open actions" />
        <PromptInputActionMenuContent>
          <PromptInputActionMenuItem onclick={() => { action = 'browse'; }}>Browse</PromptInputActionMenuItem>
        </PromptInputActionMenuContent>
      </PromptInputActionMenu>
      <PromptInputSelect bind:value={model}>
        <PromptInputSelectTrigger aria-label="Choose model"><PromptInputSelectValue /></PromptInputSelectTrigger>
        <PromptInputSelectContent>
          <PromptInputSelectItem value="fast">Fast</PromptInputSelectItem>
          <PromptInputSelectItem value="deep">Deep</PromptInputSelectItem>
        </PromptInputSelectContent>
      </PromptInputSelect>
    </PromptInputTools>
    <PromptInputSubmit />
  </PromptInputFooter>
</PromptInput>
