<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface CodeBlockProps {
    code: string;
    language?: string;
    lang?: string;
    showLineNumbers?: boolean;
    hideLines?: boolean;
    highlight?: Array<number | [number, number]>;
    variant?: 'default' | 'secondary';
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  }
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { provideCodeBlockContext } from './context.svelte.js';
  import CodeBlockContainer from './CodeBlockContainer.svelte';
  import CodeBlockContent from './CodeBlockContent.svelte';

  let { code, language, lang, showLineNumbers, hideLines, highlight = [], variant = 'default', class: className = '', children, ...rest }: CodeBlockProps = $props();
  const resolvedLanguage = $derived(language ?? lang ?? 'typescript');
  const resolvedLineNumbers = $derived(showLineNumbers ?? (hideLines === undefined ? false : !hideLines));
  provideCodeBlockContext({ get code() { return code; } });
</script>
<CodeBlockContainer class={cn(variant === 'secondary' && 'bg-secondary border-transparent', className)} language={resolvedLanguage} {...rest}>
  {@render children?.()}
  <CodeBlockContent {code} language={resolvedLanguage} showLineNumbers={resolvedLineNumbers} {highlight} />
</CodeBlockContainer>
