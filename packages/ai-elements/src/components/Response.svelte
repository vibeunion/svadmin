<script module lang="ts">
  import type { StreamdownProps } from 'streamdown-svelte';

  export type ResponseProps = Omit<
    StreamdownProps<Record<string, unknown>>,
    'content' | 'class' | 'className' | 'mode' | 'static' | 'isAnimating' | 'caret'
  > & {
    content?: string;
    text?: string;
    streaming?: boolean;
    class?: string;
  };
</script>

<script lang="ts">
  import { definedReactiveOptions } from '@svadmin/core/options';
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
    streamdown = $bindable(),
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
  // Preserve the renderer-owned context when parent props or streaming state change.
  const contextBinding = definedReactiveOptions({
    get streamdown() { return streamdown; },
    set streamdown(next: StreamdownProps<Record<string, unknown>>['streamdown']) { streamdown = next; },
  });
</script>

<Streamdown
  {...rest}
  {...contextBinding}
  content={responseText}
  class={cn('svadmin-ai__markdown', className)}
  mode={streaming ? 'streaming' : 'static'}
  isAnimating={streaming}
  caret="block"
  {baseTheme}
  {skipHtml}
  {controls}
  translations={{ copyCode: 'Copy code', copied: 'Copied', ...translations }}
/>
