<script module lang="ts">
  import type { Status } from './StatusBadge.svelte';

  export interface TimelineItem {
    id: string;
    title: string;
    description?: string;
    timestamp?: string;
    actor?: string;
    status?: Status;
    tag?: string;
    meta?: Record<string, unknown>;
  }
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import StatusBadge from './StatusBadge.svelte';
  import DataState from './DataState.svelte';

  interface Props {
    items?: TimelineItem[];
    emptyTitle?: string;
    emptyDescription?: string;
    class?: string;
  }

  let {
    items = [],
    emptyTitle = 'No timeline events',
    emptyDescription = 'Activity events and status transitions will appear here.',
    class: className = '',
  }: Props = $props();

  const dotClass: Record<Status, string> = {
    success: 'svadmin-u-3355648fe22b svadmin-u-18a6e7a36f29 svadmin-u-76747e5e02ff',
    warning: 'svadmin-u-a486cacb3a15 svadmin-u-2f960aa0c478 svadmin-u-3a4ff758c2ab',
    danger: 'svadmin-u-fb1b0d05046d svadmin-u-9d5d8b4711b4 svadmin-u-811148b13d1e',
    info: 'svadmin-u-75b1bec3ea0e svadmin-u-05f954a846d6 svadmin-u-20aaf08a7ed1',
    neutral: 'svadmin-u-43ed7af3fc8a svadmin-u-18049387f0af svadmin-u-bfa603190748',
  };
</script>

<div class={cn('svadmin-u-3e7ce58d64fa', className)}>
  {#if items.length === 0}
    <DataState state="empty" title={emptyTitle} description={emptyDescription} />
  {:else}
    <div class="svadmin-u-d89972fe17d6 svadmin-u-9079b62ef1cb svadmin-u-b3542e058833 svadmin-u-884dada40b17 svadmin-u-699f6fc4b3e0 svadmin-u-37f34e63818d svadmin-u-f76c7493f919 svadmin-u-8f848a57f066 svadmin-u-3242dfaf010c">
      {#each items as item (item.id)}
        {@const statusTone = item.status ?? 'info'}
        <div class="svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-44ee8ba0a421 svadmin-u-fc7473ca09eb group">
          <span
            class={cn(
              'svadmin-u-da4dbfbc4fdc svadmin-u-e9cbeabe7285 svadmin-u-c55dcda26eec svadmin-u-60fbb7713999 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-65935df577ba svadmin-u-e6f9e383a762 svadmin-u-eadef238231e svadmin-u-0b9c5172dd56',
              item.status ? dotClass[statusTone] : 'svadmin-u-18049387f0af svadmin-u-2ef11f1cb219'
            )}
            aria-hidden="true"
          ></span>

          <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4">
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
              <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{item.title}</span>
              {#if item.actor}
                <span class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">by {item.actor}</span>
              {/if}
              {#if item.status}
                <StatusBadge status={item.status} label={item.tag ?? item.status} class="svadmin-u-d058ca6de60f svadmin-u-68ecb30dbec6 svadmin-u-11e59c6d5f6b" />
              {:else if item.tag}
                <span class="svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-07389a777c1f svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-45d828117213 svadmin-u-465609a240a8 svadmin-u-d058ca6de60f svadmin-u-2689f3958069 svadmin-u-bfa603190748 svadmin-u-2ef11f1cb219">
                  {item.tag}
                </span>
              {/if}
            </div>
            {#if item.timestamp}
              <time class="svadmin-u-359090c2d529 svadmin-u-3032cae0badb svadmin-u-bfa603190748 svadmin-u-0e65706bcccd">{item.timestamp}</time>
            {/if}
          </div>

          {#if item.description}
            <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-6b189c6edadb svadmin-u-a2edcb1a3a6b">{item.description}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
