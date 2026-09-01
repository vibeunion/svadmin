<script module lang="ts">
  import type { CodeBlockProps } from '../code-block/CodeBlock.svelte';
  export type CodeRootProps = Omit<CodeBlockProps, 'language' | 'lang' | 'showLineNumbers'> & {
    code: string;
    lang?: string;
    language?: string;
    hideLines?: boolean;
  };
</script>

<script lang="ts">
  import CodeBlock from '../code-block/CodeBlock.svelte';
  let { code, lang = 'typescript', language, hideLines = false, ...rest }: CodeRootProps = $props();
</script>

<CodeBlock {...rest} {code} language={language ?? lang} showLineNumbers={!hideLines} />
