<script lang="ts">
  import type { Snippet } from 'svelte';
  import { AlertTriangle, Inbox, LockKeyhole, RefreshCw } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import * as Alert from '../ui/alert/index.js';
  import { Skeleton } from '../ui/skeleton/index.js';
  export type DataStateKind = 'loading' | 'empty' | 'error' | 'forbidden';
  interface Props {
    state: DataStateKind;
    title?: string;
    description?: string;
    retry?: () => void;
    action?: Snippet;
    class?: string;
  }
  let { state, title, description, retry, action, class: className = '' }: Props = $props();
  const defaults = {
    loading: ['Loading', 'Fetching the latest data.'],
    empty: ['Nothing here yet', 'New records will appear here when they are available.'],
    error: ['Unable to load data', 'Try again or check the connection before continuing.'],
    forbidden: ['Access restricted', 'You do not have permission to view this content.'],
  } as const;
  const resolvedTitle = $derived(title ?? defaults[state][0]);
  const resolvedDescription = $derived(description ?? defaults[state][1]);
</script>

{#if state === 'loading'}
  <div class={'space-y-3 rounded-lg border border-border bg-card p-5 ' + className} aria-busy="true">
    <Skeleton class="h-5 w-40" /><Skeleton class="h-4 w-full max-w-md" /><Skeleton class="h-20 w-full" />
  </div>
{:else if state === 'error' || state === 'forbidden'}
  <Alert.Root variant={state === 'error' ? 'destructive' : 'warning'} class={className}>
    {#if state === 'error'}<AlertTriangle class="size-4" />{:else}<LockKeyhole class="size-4" />{/if}
    <Alert.Title>{resolvedTitle}</Alert.Title>
    <Alert.Description>{resolvedDescription}</Alert.Description>
    {#if retry}<Button variant="outline" size="sm" class="mt-3" onclick={retry}><RefreshCw class="size-3.5" />Retry</Button>{/if}
    {#if action}<div class="mt-3">{@render action()}</div>{/if}
  </Alert.Root>
{:else}
  <div class={'flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-6 text-center ' + className}>
    <Inbox class="size-8 text-muted-foreground" /><h3 class="mt-3 text-sm font-semibold text-foreground">{resolvedTitle}</h3><p class="mt-1 max-w-sm text-sm text-muted-foreground">{resolvedDescription}</p>
    {#if action}<div class="mt-4">{@render action()}</div>{/if}
  </div>
{/if}
