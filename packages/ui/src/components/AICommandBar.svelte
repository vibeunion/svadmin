<script lang="ts">
  import { captureAdminContext, toggleTheme, useNavigation } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Command } from './ui/command/index.js';
  import * as Dialog from './ui/dialog/index.js';
  import { Search, LayoutDashboard, Plus, Sun, FileText, Sparkles, Loader2 } from '@lucide/svelte';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  import CanAccess from './CanAccess.svelte';

  const i18n = useTranslation();

  let { open = $bindable(false) } = $props<{ open?: boolean }>();
  const adminContext = captureAdminContext();
  const navigation = useNavigation();
  let searchValue = $state('');
  
  const resources = $derived(adminContext.resources);
  const provider = $derived(adminContext.chatProvider);

  // AI State
  let aiMode = $state(false);
  let aiResponse = $state('');
  let isPredicting = $state(false);
  let abortController: AbortController | null = null;
  let requestEpoch = 0;

  $effect(() => {
    void provider;
    void adminContext.tenantCacheKey?.__svadminTenant;
    void open;
    clearAIConversation();

    return cancelAIRequest;
  });

  function close() {
    open = false;
    clearAIConversation();
  }

  function cancelAIRequest() {
    requestEpoch += 1;
    abortController?.abort();
    abortController = null;
  }

  function clearAIConversation() {
    cancelAIRequest();
    searchValue = '';
    aiMode = false;
    aiResponse = '';
    isPredicting = false;
  }

  function act(fn: () => void) {
    fn();
    close();
  }

  async function askAI() {
    const scopedProvider = provider;
    const prompt = searchValue.trim();
    if (!scopedProvider || !prompt) return;

    cancelAIRequest();
    const epoch = requestEpoch;
    const controller = new AbortController();
    abortController = controller;
    aiMode = true;
    isPredicting = true;
    aiResponse = '';

    try {
      const result = scopedProvider.sendMessage(
        [{ id: 'cmd', role: 'user', content: prompt, timestamp: Date.now() }],
        { signal: controller.signal }
      );

      if (Symbol.asyncIterator in result) {
        for await (const chunk of result as AsyncIterable<string>) {
          if (epoch !== requestEpoch) return;
          aiResponse += chunk;
        }
      } else {
        const response = await result;
        if (epoch === requestEpoch) aiResponse = response;
      }
    } catch (err: unknown) {
      if (epoch === requestEpoch && err instanceof Error && err.name !== 'AbortError') {
        aiResponse = 'Failed to get response from AI.';
      }
    } finally {
      if (epoch === requestEpoch) {
        isPredicting = false;
        if (abortController === controller) abortController = null;
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && searchValue.trim() && !aiMode) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        void askAI();
      }
    }
  }

  const itemClass = 'relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[selected]:bg-accent data-[selected]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';
</script>

<Dialog.Dialog bind:open onOpenChange={(v: boolean) => !v && close()}>
  <Dialog.DialogContent class="overflow-hidden p-0 sm:max-w-[600px] border-none shadow-2xl">
    <Dialog.DialogTitle class="sr-only">{i18n.t('common.actions')}</Dialog.DialogTitle>
    <Command.Root
      shouldFilter={!aiMode}
      class="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground [&_[data-command-group-heading]]:text-muted-foreground [&_[data-command-group-heading]]:px-2 [&_[data-command-group-heading]]:py-1.5 [&_[data-command-group-heading]]:text-xs [&_[data-command-group-heading]]:font-semibold [&_[data-command-group-heading]]:uppercase [&_[data-command-group-heading]]:tracking-wider"
    >
      <div class="flex items-center border-b px-3 h-12 relative" data-cmdk-input-wrapper="">
        {#if aiMode}
          <Sparkles class="mr-2 h-4 w-4 shrink-0 text-warning animate-pulse" />
        {:else}
          <Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
        {/if}
        <Command.Input
          bind:value={searchValue}
          onkeydown={handleKeyDown}
          placeholder={aiMode ? "Ask AI anything..." : "Search commands or ask AI (Ctrl+Enter)..."}
          class="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        {#if searchValue.trim() && !aiMode}
          <button 
            type="button"
            class="absolute right-3 flex items-center gap-1 text-[10px] font-medium text-warning bg-warning/10 hover:bg-warning/20 px-2 py-1 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onclick={askAI}
          >
            <Sparkles class="h-3 w-3" />
            <kbd class="font-sans">Ctrl+Enter</kbd> to Ask AI
          </button>
        {/if}
      </div>

      {#if !aiMode}
        <Command.List class="max-h-[360px] overflow-y-auto overflow-x-hidden p-1">
          <Command.Empty class="py-6 text-center text-sm text-muted-foreground">
            No standard commands found. Press <kbd class="px-1 py-0.5 rounded bg-muted border font-sans text-[10px]">Ctrl+Enter</kbd> to ask AI.
          </Command.Empty>

          <!-- Navigation -->
          <Command.Group heading={i18n.t('common.home')}>
            <Command.Item value="home" onSelect={() => act(() => adminContext.navigate('/'))} class={itemClass}>
              <LayoutDashboard class="h-4 w-4 text-muted-foreground" />
              {i18n.t('common.home')}
            </Command.Item>
            {#each resources as r, _i (_i)}
              {#if adminContext.accessControlProvider}
                <CanAccess resource={r.name} action="list">
                  <Command.Item value={r.name} onSelect={() => act(() => navigation.list(r.name))} class={itemClass}>
                    <FileText class="h-4 w-4 text-muted-foreground" />
                    {r.label}
                  </Command.Item>
                </CanAccess>
              {:else}
                <Command.Item value={r.name} onSelect={() => act(() => navigation.list(r.name))} class={itemClass}>
                  <FileText class="h-4 w-4 text-muted-foreground" />
                  {r.label}
                </Command.Item>
              {/if}
            {/each}
          </Command.Group>

          <Command.Separator class="mx-1 my-1 h-px bg-border" />

          <!-- Actions -->
          <Command.Group heading={i18n.t('common.actions')}>
            {#each resources as r, _i (_i)}
              {#if r.canCreate !== false}
                {#if adminContext.accessControlProvider}
                  <CanAccess resource={r.name} action="create">
                    <Command.Item value={`create-${r.name}`} onSelect={() => act(() => navigation.create(r.name))} class={itemClass}>
                      <Plus class="h-4 w-4 text-muted-foreground" />
                      {i18n.t('common.create')} {r.label}
                    </Command.Item>
                  </CanAccess>
                {:else}
                  <Command.Item value={`create-${r.name}`} onSelect={() => act(() => navigation.create(r.name))} class={itemClass}>
                    <Plus class="h-4 w-4 text-muted-foreground" />
                    {i18n.t('common.create')} {r.label}
                  </Command.Item>
                {/if}
              {/if}
            {/each}
            <Command.Item value="toggle-theme" onSelect={() => act(() => toggleTheme())} class={itemClass}>
              <Sun class="h-4 w-4 text-muted-foreground" />
              {i18n.t('common.toggleTheme')}
            </Command.Item>
          </Command.Group>
        </Command.List>
      {:else}
        <!-- AI Response Area -->
        <div class="h-[360px] max-h-[360px] overflow-y-auto p-4 bg-muted/20">
          <div class="flex items-start gap-3">
            <div class="mt-0.5 w-8 h-8 rounded-full bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <Sparkles class="h-4 w-4" />
            </div>
            <div class="flex-1 w-full text-sm">
              {#if !aiResponse && isPredicting}
                <div class="flex items-center gap-2 text-muted-foreground mt-1.5">
                  <Loader2 class="h-4 w-4 animate-spin" /> Thinking...
                </div>
              {:else}
                <MarkdownRenderer content={aiResponse} streaming={isPredicting} />
              {/if}
            </div>
          </div>
        </div>
        <div class="p-2 border-t flex justify-end gap-2 bg-muted/10">
          <button 
            class="text-xs px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
            onclick={clearAIConversation}
          >
            Clear & Return
          </button>
        </div>
      {/if}
    </Command.Root>
  </Dialog.DialogContent>
</Dialog.Dialog>
