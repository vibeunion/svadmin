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
  import { createResponseHtmlPreparer } from './message/content-polish-html.js';

  let {
    content = '',
    text,
    streaming = false,
    class: className = '',
    baseTheme = 'shadcn',
    skipHtml = true,
    controls = { code: { copy: true, download: false }, mermaid: false, table: false },
    translations,
    extensions = [],
    ...rest
  }: ResponseProps = $props();

  const prepareResponseHtml = createResponseHtmlPreparer();
  const response = $derived(prepareResponseHtml(text ?? content, extensions));
  let streamdownContext = $state<StreamdownContext>();
</script>

<Streamdown
  bind:streamdown={streamdownContext}
  {...rest}
  content={response.content}
  extensions={response.extensions}
  class={cn('svadmin-ai__markdown', className)}
  mode={streaming ? 'streaming' : 'static'}
  isAnimating={streaming}
  caret={streaming ? 'block' : undefined}
  {baseTheme}
  {skipHtml}
  {controls}
  translations={{ copyCode: 'Copy code', copied: 'Copied', ...translations }}
/>
