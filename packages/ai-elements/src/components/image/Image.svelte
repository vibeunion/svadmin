<script module lang="ts">
  import type { HTMLImgAttributes } from 'svelte/elements';

  export interface GeneratedImageData {
    base64?: string;
    uint8Array?: Uint8Array;
    mediaType: string;
  }

  export type ImageProps = Omit<HTMLImgAttributes, 'class' | 'src'> & GeneratedImageData & {
    class?: string;
    src?: string;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

  let {
    base64,
    uint8Array,
    mediaType,
    src,
    alt = '',
    class: className = '',
    ...rest
  }: ImageProps = $props();

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  function encodeBase64(bytes?: Uint8Array): string {
    if (!bytes?.length) return '';
    let output = '';
    for (let index = 0; index < bytes.length; index += 3) {
      const first = bytes[index] ?? 0;
      const second = bytes[index + 1] ?? 0;
      const third = bytes[index + 2] ?? 0;
      const value = (first << 16) | (second << 8) | third;
      output += alphabet[(value >> 18) & 63];
      output += alphabet[(value >> 12) & 63];
      output += index + 1 < bytes.length ? alphabet[(value >> 6) & 63] : '=';
      output += index + 2 < bytes.length ? alphabet[value & 63] : '=';
    }
    return output;
  }

  const resolvedBase64 = $derived(base64 ?? encodeBase64(uint8Array));
  const resolvedSrc = $derived(src ?? (resolvedBase64 ? `data:${mediaType};base64,${resolvedBase64}` : undefined));
</script>

<img
  {...rest}
  src={resolvedSrc}
  {alt}
  class={cn('svadmin-ai svadmin-ai-image', className)}
  data-slot="image"
/>

<style>
  .svadmin-ai-image {
    display: block;
    max-width: 100%;
    height: auto;
    overflow: hidden;
    border-radius: min(var(--radius, 0.5rem), 0.5rem);
  }
</style>
