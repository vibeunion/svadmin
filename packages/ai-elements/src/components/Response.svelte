<script module lang="ts">
  import type { StreamdownContext, StreamdownProps } from 'streamdown-svelte';

  export type ResponseProps = Omit<
    StreamdownProps,
    'content' | 'class' | 'className' | 'mode' | 'static' | 'isAnimating' | 'caret'
  > & {
    content?: string;
    text?: string;
    streaming?: boolean;
    class?: string;
  };
</script>

<script lang="ts">
  import { Streamdown } from 'streamdown-svelte';
  import { cn } from '../utils.js';

  let {
    content = '',
    text,
    streaming = false,
    class: className = '',
    baseTheme = 'shadcn',
    skipHtml = true,
    controls = { code: { copy: true, download: false }, mermaid: false, table: false },
    translations,
    ...rest
  }: ResponseProps = $props();

  function escapeRawHtmlTags(markdown: string): string {
    let inFence = false;
    return markdown
      .split('\n')
      .map((line) => {
        if (/^\s{0,3}(`{3,}|~{3,})/.test(line)) {
          inFence = !inFence;
          return line;
        }
        return inFence
          ? line
          : line.replace(/<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s[^<>]*?)?\/?\s*>/g, (tag) =>
              tag.replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
            );
      })
      .join('\n');
  }

  const responseText = $derived(escapeRawHtmlTags(text ?? content));
  let streamdownContext = $state<StreamdownContext>();
</script>

<Streamdown
  bind:streamdown={streamdownContext}
  {...rest}
  content={responseText}
  class={cn('svadmin-ai__markdown', className)}
  mode={streaming ? 'streaming' : 'static'}
  isAnimating={streaming}
  caret={streaming ? 'block' : undefined}
  {baseTheme}
  {skipHtml}
  {controls}
  translations={{ copyCode: 'Copy code', copied: 'Copied', ...translations }}
/>
