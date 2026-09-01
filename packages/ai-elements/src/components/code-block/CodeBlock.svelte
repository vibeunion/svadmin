<script lang="ts">
  import type { Snippet } from 'svelte';
  import { provideCodeBlockContext } from './context.svelte.js';
  import CodeBlockContainer from './CodeBlockContainer.svelte';
  import CodeBlockContent from './CodeBlockContent.svelte';

  let { code, language, showLineNumbers = false, class: className = '', children, ...rest }: { code: string; language: string; showLineNumbers?: boolean; class?: string; children?: Snippet; [key: string]: unknown } = $props();
  provideCodeBlockContext({ get code() { return code; } });
</script>
<CodeBlockContainer class={className} {language} {...rest}>
  {@render children?.()}
  <CodeBlockContent {code} {language} {showLineNumbers} />
</CodeBlockContainer>
