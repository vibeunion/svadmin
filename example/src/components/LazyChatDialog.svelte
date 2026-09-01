<script lang="ts">
  import type { Component } from 'svelte';

  type ChatDialogProps = {
    docked?: boolean;
    scope?: string;
    ownerScope?: string;
  };

  let { docked, scope, ownerScope }: ChatDialogProps = $props();

  let dialogModulePromise = $state<Promise<{ ChatDialog: Component<ChatDialogProps> }> | undefined>(undefined);

  $effect(() => {
    dialogModulePromise ??= import('@svadmin/ai-elements').then((m) => ({
      ChatDialog: m.ChatDialog as unknown as Component<ChatDialogProps>,
    }));
  });
</script>

{#if dialogModulePromise}
  {#await dialogModulePromise}
    <div class="flex h-12 items-center justify-center p-4" role="status" aria-live="polite">
      <span class="text-xs text-muted-foreground">Loading assistant...</span>
    </div>
  {:then { ChatDialog }}
    <ChatDialog {docked} {scope} {ownerScope} />
  {:catch}
    <div class="flex h-12 items-center justify-center p-4" role="alert">
      <span class="text-xs text-destructive">Unable to load assistant.</span>
    </div>
  {/await}
{/if}
