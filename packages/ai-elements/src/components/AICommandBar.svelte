<script lang="ts">
  import {
    captureAdminContext,
    toggleTheme,
    useNavigation,
    useParsed,
    type ResourceDefinition,
  } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import {
    FileText,
    LayoutDashboard,
    LoaderCircle,
    Plus,
    Search,
    Sparkles,
    Sun,
    X,
  } from '@lucide/svelte';
  import { consumeTextResponse } from '../contracts.js';
  import type { ChatContext, ChatMessage, ChatProvider } from '../contracts.js';
  import CanAccess from '../internal/CanAccess.svelte';
  import Response from './Response.svelte';
  import { cn } from '../utils.js';

  type Props = {
    open?: boolean;
    placeholder?: string;
    class?: string;
    onnavigate?: (path: string) => void;
  };

  let {
    open = $bindable(false),
    placeholder = 'Search commands or ask AI (Ctrl+Enter)…',
    class: className = '',
    onnavigate,
  }: Props = $props();

  const adminContext = captureAdminContext();
  const i18n = useTranslation();
  const navigation = useNavigation();
  const parsed = useParsed();
  const generatedId = $props.id();
  const provider = $derived(adminContext.chatProvider);
  const resources = $derived(adminContext.resources);
  const chatContext = $derived<ChatContext>({
    currentResource: parsed.resource,
    selectedRecordId: parsed.id,
    currentView: parsed.action,
    pathname: adminContext.currentPath(),
  });

  let query = $state('');
  let answer = $state('');
  let aiMode = $state(false);
  let loading = $state(false);
  let inputElement = $state<HTMLInputElement | null>(null);
  let abortController: AbortController | null = null;
  let requestEpoch = 0;

  const filteredResources = $derived.by(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return resources;
    return resources.filter((resource) => (
      resource.name.toLocaleLowerCase().includes(term)
      || resource.label.toLocaleLowerCase().includes(term)
    ));
  });

  function cancelRequest(): void {
    requestEpoch += 1;
    abortController?.abort();
    abortController = null;
  }

  function clearConversation(): void {
    cancelRequest();
    query = '';
    answer = '';
    aiMode = false;
    loading = false;
  }

  function close(): void {
    open = false;
    clearConversation();
  }

  function returnToCommands(): void {
    clearConversation();
    queueMicrotask(() => inputElement?.focus());
  }

  function runAction(action: () => void): void {
    action();
    close();
  }

  function navigateHome(): void {
    runAction(() => {
      if (onnavigate) onnavigate('/');
      else void adminContext.navigate('/');
    });
  }

  function navigateToResource(resource: ResourceDefinition): void {
    runAction(() => {
      if (onnavigate) onnavigate(`/${resource.name}`);
      else void navigation.list(resource.name);
    });
  }

  function createResource(resource: ResourceDefinition): void {
    runAction(() => {
      if (onnavigate) onnavigate(`/${resource.name}/create`);
      else void navigation.create(resource.name);
    });
  }

  function isCurrentRequest(epoch: number, controller: AbortController): boolean {
    return epoch === requestEpoch && abortController === controller && !controller.signal.aborted;
  }

  async function ask(): Promise<void> {
    const scopedProvider: ChatProvider | null = provider;
    const prompt = query.trim();
    if (!scopedProvider || !prompt) return;
    const scopedContext: ChatContext = {
      currentResource: chatContext.currentResource,
      selectedRecordId: chatContext.selectedRecordId,
      currentView: chatContext.currentView,
      pathname: chatContext.pathname,
    };

    cancelRequest();
    const epoch = requestEpoch;
    const controller = new AbortController();
    abortController = controller;
    aiMode = true;
    loading = true;
    answer = '';

    const request: ChatMessage = {
      id: `command-${generatedId}-${epoch}`,
      role: 'user',
      parts: [{ type: 'text', text: prompt }],
      createdAt: Date.now(),
      status: 'complete',
    };

    try {
      await consumeTextResponse(
        scopedProvider.sendMessage([request], { signal: controller.signal, context: scopedContext }),
        (text) => { answer = text; },
        { signal: controller.signal, isCurrent: () => isCurrentRequest(epoch, controller) },
      );
    } catch (error) {
      if (isCurrentRequest(epoch, controller) && !(error instanceof Error && error.name === 'AbortError')) {
        answer = 'Failed to get a response from AI.';
      }
    } finally {
      if (isCurrentRequest(epoch, controller)) {
        loading = false;
        abortController = null;
      }
    }
  }

  function handleInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && query.trim() && !aiMode) {
      event.preventDefault();
      void ask();
    }
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (open && event.key === 'Escape') close();
  }

  $effect(() => {
    const scopedProvider = provider;
    const scopedResource = chatContext.currentResource;
    const scopedRecord = chatContext.selectedRecordId;
    const scopedView = chatContext.currentView;
    const scopedPath = chatContext.pathname;
    const tenant = adminContext.tenantCacheKey?.__svadminTenant;
    const isOpen = open;
    void scopedProvider;
    void scopedResource;
    void scopedRecord;
    void scopedView;
    void scopedPath;
    void tenant;
    void isOpen;

    clearConversation();
    if (isOpen) queueMicrotask(() => inputElement?.focus());
    return cancelRequest;
  });
</script>

{#snippet resourceCommand(resource: ResourceDefinition)}
  <button type="button" class="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onclick={() => navigateToResource(resource)}>
    <FileText class="size-4 text-muted-foreground" aria-hidden="true" />
    {resource.label}
  </button>
{/snippet}

{#snippet createCommand(resource: ResourceDefinition)}
  <button type="button" class="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onclick={() => createResource(resource)}>
    <Plus class="size-4 text-muted-foreground" aria-hidden="true" />
    {i18n.t('common.create')} {resource.label}
  </button>
{/snippet}

{#if open}
  <div
    class="svadmin-ai fixed inset-0 z-50 flex items-start justify-center bg-background/70 p-4 pt-16 sm:pt-24"
    role="presentation"
    onclick={(event) => { if (event.currentTarget === event.target) close(); }}
  >
    <div
      class={cn('svadmin-ai__surface w-full max-w-2xl overflow-hidden shadow-xl', className)}
      role="dialog"
      aria-modal="true"
      aria-label={i18n.t('common.actions')}
    >
      <div class="flex min-h-12 items-center gap-2 border-b border-border px-3">
        {#if aiMode}
          <Sparkles class="size-4 shrink-0 text-warning" aria-hidden="true" />
        {:else}
          <Search class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {/if}
        <input
          bind:this={inputElement}
          class="min-h-12 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          bind:value={query}
          {placeholder}
          aria-label="Command or AI query"
          onkeydown={handleInputKeydown}
        />
        {#if query.trim() && !aiMode}
          <button
            type="button"
            class="svadmin-ai__button svadmin-ai__button--ghost min-h-8 px-2 text-xs"
            disabled={!provider || loading}
            onclick={ask}
          >
            <Sparkles class="size-3.5" aria-hidden="true" />
            Ask AI
            <kbd class="text-muted-foreground">Ctrl+Enter</kbd>
          </button>
        {/if}
        <button
          type="button"
          class="svadmin-ai__button svadmin-ai__button--ghost min-h-8 px-2"
          aria-label="Close command bar"
          onclick={close}
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </div>

      {#if aiMode}
        <div class="h-80 overflow-y-auto bg-muted/20 p-4" aria-live="polite" aria-busy={loading}>
          <div class="flex items-start gap-3">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
              <Sparkles class="size-4" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex-1 text-sm">
              {#if loading && !answer}
                <p class="svadmin-ai__muted flex items-center gap-2 py-1">
                  <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
                  Thinking…
                </p>
              {:else}
                <Response text={answer} streaming={loading} />
              {/if}
            </div>
          </div>
        </div>
        <footer class="flex justify-end border-t border-border bg-muted/10 p-2">
          <button type="button" class="svadmin-ai__button svadmin-ai__button--ghost min-h-8 px-3 text-xs" onclick={returnToCommands}>
            Clear and return
          </button>
        </footer>
      {:else}
        <div class="max-h-80 overflow-y-auto p-2">
          <div class="px-2 py-1 text-xs font-semibold text-muted-foreground">{i18n.t('common.home')}</div>
          <button type="button" class="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onclick={navigateHome}>
            <LayoutDashboard class="size-4 text-muted-foreground" aria-hidden="true" />
            {i18n.t('common.home')}
          </button>
          {#each filteredResources as resource (resource.name)}
            {#if adminContext.accessControlProvider}
              <CanAccess resource={resource.name} action="list">
                {@render resourceCommand(resource)}
              </CanAccess>
            {:else}
              {@render resourceCommand(resource)}
            {/if}
          {/each}

          <div class="my-2 border-t border-border"></div>
          <div class="px-2 py-1 text-xs font-semibold text-muted-foreground">{i18n.t('common.actions')}</div>
          {#each filteredResources.filter((resource) => resource.canCreate !== false) as resource (`create-${resource.name}`)}
            {#if adminContext.accessControlProvider}
              <CanAccess resource={resource.name} action="create">
                {@render createCommand(resource)}
              </CanAccess>
            {:else}
              {@render createCommand(resource)}
            {/if}
          {/each}
          <button type="button" class="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onclick={() => runAction(toggleTheme)}>
            <Sun class="size-4 text-muted-foreground" aria-hidden="true" />
            {i18n.t('common.toggleTheme')}
          </button>

          {#if filteredResources.length === 0}
            <p class="svadmin-ai__muted px-2 py-6 text-center text-sm">No commands found. Press Ctrl+Enter to ask AI.</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<svelte:window onkeydown={handleWindowKeydown} />
