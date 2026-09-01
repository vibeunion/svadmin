<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { AttachmentDataLike } from './types.js';

  export type AttachmentProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & {
    data: AttachmentDataLike;
    onRemove?: () => void;
    onremove?: () => void;
    class?: string;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { getMediaCategory } from './attachments.js';
  import { provideAttachmentContext, useAttachmentsContext } from './context.svelte.js';
  import { normalizeAttachmentData } from './types.js';

  let { data, onRemove, onremove, class: className = '', children, ...rest }: AttachmentProps = $props();
  const attachments = useAttachmentsContext();
  const normalizedData = $derived(normalizeAttachmentData(data));
  const mediaCategory = $derived(getMediaCategory(data));

  provideAttachmentContext({
    get data() { return normalizedData; },
    get mediaCategory() { return mediaCategory; },
    get onRemove() { return onRemove ?? onremove; },
    get variant() { return attachments.variant; },
  });
</script>

<div
  {...rest}
  class={cn('svadmin-ai-attachment', className)}
  data-category={mediaCategory}
  data-slot="attachment"
  data-variant={attachments.variant}
>
  {@render children?.()}
</div>

<style>
  .svadmin-ai-attachment { position: relative; color: var(--foreground, currentColor); }
  .svadmin-ai-attachment[data-variant='grid'] { width: 6rem; height: 6rem; overflow: hidden; border-radius: min(var(--radius, .5rem), .5rem); }
  .svadmin-ai-attachment[data-variant='inline'] { display: flex; min-height: 2rem; align-items: center; gap: .375rem; padding: .25rem .375rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .375rem); font-size: .8125rem; font-weight: 550; }
  .svadmin-ai-attachment[data-variant='list'] { display: flex; width: 100%; align-items: center; gap: .75rem; padding: .75rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, transparent); }
  .svadmin-ai-attachment[data-variant='inline']:hover, .svadmin-ai-attachment[data-variant='list']:hover { background: var(--muted, transparent); }
</style>
