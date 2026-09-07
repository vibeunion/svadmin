<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CircleAlert, Info, TriangleAlert } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  export type FeedbackNoticeTone = 'info' | 'warning' | 'danger';
  export type FeedbackNoticePriority = 'contextual' | 'blocking';

  interface Props {
    message: string;
    tone?: FeedbackNoticeTone;
    priority?: FeedbackNoticePriority;
    action?: Snippet;
    class?: string;
  }

  let {
    message,
    tone = 'info',
    priority = 'contextual',
    action,
    class: className = '',
  }: Props = $props();

  const isBlocking = $derived(priority === 'blocking' || tone === 'danger');
  const toneClass = $derived(
    tone === 'danger'
      ? 'svadmin-u-26e4f7bdbd56 svadmin-u-7a0854fdbc30 svadmin-u-811148b13d1e'
      : tone === 'warning'
        ? 'svadmin-u-d008dee27eaa svadmin-u-283481e780bb svadmin-u-3a4ff758c2ab'
        : 'svadmin-u-18049387f0af svadmin-u-b00f43c30c2b svadmin-u-d4108abe6359',
  );
</script>

<div
  data-svadmin-feedback-notice
  data-tone={tone}
  data-priority={priority}
  role={isBlocking ? 'alert' : 'status'}
  aria-live={isBlocking ? 'assertive' : 'polite'}
  class={cn(
    'svadmin-u-60fbb7713999 svadmin-u-6da6a3c3f741 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-fc7473ca09eb svadmin-u-020ba687fa12 svadmin-u-9f76a62f4f44',
    isBlocking && 'svadmin-u-f57e7530965b',
    toneClass,
    className,
  )}
>
  <div class="svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c svadmin-u-60541e1e26f8 svadmin-u-7e9a2a250cc3">
    {#if tone === 'danger'}
      <CircleAlert class="svadmin-u-15e1b1f444fe svadmin-u-f7b5fa971871 svadmin-u-012fbd121f37" aria-hidden="true" />
    {:else if tone === 'warning'}
      <TriangleAlert class="svadmin-u-15e1b1f444fe svadmin-u-f7b5fa971871 svadmin-u-012fbd121f37" aria-hidden="true" />
    {:else}
      <Info class="svadmin-u-15e1b1f444fe svadmin-u-f7b5fa971871 svadmin-u-012fbd121f37 svadmin-u-bfa603190748" aria-hidden="true" />
    {/if}
    <p class="svadmin-u-7e0b7cdf1a94 svadmin-u-7054e2767710">{message}</p>
  </div>
  {#if action}
    <div class="svadmin-u-012fbd121f37">{@render action()}</div>
  {/if}
</div>
