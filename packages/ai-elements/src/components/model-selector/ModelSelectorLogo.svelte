<script module lang="ts">
  import type { HTMLImgAttributes } from 'svelte/elements';

  export type ModelSelectorProvider =
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'google-vertex'
    | 'azure'
    | 'amazon-bedrock'
    | 'deepseek'
    | 'mistral'
    | 'xai'
    | 'groq'
    | 'openrouter'
    | 'alibaba'
    | 'llama'
    | 'perplexity'
    | 'vercel'
    | (string & {});

  export type ModelSelectorLogoProps = Omit<HTMLImgAttributes, 'class' | 'src' | 'alt'> & {
    provider: ModelSelectorProvider;
    class?: string;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  let { provider, class: className = '', width = 12, height = 12, loading = 'lazy', ...rest }: ModelSelectorLogoProps = $props();
  const source = $derived(`https://models.dev/logos/${encodeURIComponent(provider)}.svg`);
</script>

<img
  {...rest}
  src={source}
  alt={`${provider} logo`}
  {width}
  {height}
  {loading}
  class={cn('svadmin-ai-model-selector-logo', className)}
  data-slot="model-selector-logo"
/>

<style>
  .svadmin-ai-model-selector-logo { width: .75rem; height: .75rem; flex: none; object-fit: contain; }
  :global(.dark) .svadmin-ai-model-selector-logo { filter: invert(1); }
</style>
