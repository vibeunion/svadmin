<script lang="ts">
  import CodeBlock from './CodeBlock.svelte';

  let {
    code = $bindable(),
    language = $bindable(),
    showLineNumbers = false,
  }: {
    code: string;
    language: string;
    showLineNumbers?: boolean;
  } = $props();
</script>

<CodeBlock {code} {language} {showLineNumbers} />

<button type="button" onclick={() => { code = '# Updated\n*italic*'; language = 'markdown'; }}>
  Update code
</button>
