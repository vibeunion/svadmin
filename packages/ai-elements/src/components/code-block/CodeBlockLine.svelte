<script lang="ts">
  import { cn } from '../../utils.js';
  import type { CodeToken } from './highlight.js';

  const EMPTY_LINE = ' ';

  let {
    tokens,
    lineNumber,
    showLineNumbers,
  }: {
    tokens: CodeToken[];
    lineNumber: number;
    showLineNumbers: boolean;
  } = $props();
</script>

<span class="block"><span class={cn('mr-4 inline-block w-8 select-none text-right text-muted-foreground opacity-60', !showLineNumbers && 'hidden')} aria-hidden="true">{lineNumber}</span>{#if tokens.length === 0}{EMPTY_LINE}{:else}{#each tokens as token, tokenIndex (tokenIndex)}<span class="svadmin-ai-code-token" style:--shiki-light={token.color} style:--shiki-light-bg={token.backgroundColor} style:--shiki-dark={token.darkColor} style:--shiki-dark-bg={token.darkBackgroundColor} style:--shiki-light-font-style={token.fontStyle} style:--shiki-light-font-weight={token.fontWeight} style:--shiki-light-text-decoration={token.textDecoration} style:--shiki-dark-font-style={token.darkFontStyle} style:--shiki-dark-font-weight={token.darkFontWeight} style:--shiki-dark-text-decoration={token.darkTextDecoration}>{token.content}</span>{/each}{/if}</span>

<style>
  .svadmin-ai-code-token {
    color: var(--shiki-light, inherit);
    background-color: var(--shiki-light-bg, transparent);
    font-style: var(--shiki-light-font-style, normal);
    font-weight: var(--shiki-light-font-weight, normal);
    text-decoration: var(--shiki-light-text-decoration, none);
  }

  :global(.dark) .svadmin-ai-code-token {
    color: var(--shiki-dark, inherit);
    background-color: var(--shiki-dark-bg, transparent);
    font-style: var(--shiki-dark-font-style, normal);
    font-weight: var(--shiki-dark-font-weight, normal);
    text-decoration: var(--shiki-dark-text-decoration, none);
  }
</style>
