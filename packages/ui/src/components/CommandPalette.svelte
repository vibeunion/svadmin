<script lang="ts">
  import { captureAdminContext, getResources, toggleTheme, useNavigation } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Command } from './ui/command/index.js';
  import * as Dialog from './ui/dialog/index.js';
  import { Search, LayoutDashboard, Plus, Sun, FileText, Sparkles } from '@lucide/svelte';
  import CanAccess from './CanAccess.svelte';

  const i18n = useTranslation();

  interface Props {
    open?: boolean;
    /** Callback fired when user selects "Ask AI" with a query string */
    onAskAI?: (query: string) => void;
  }

  let { open = $bindable(false), onAskAI }: Props = $props();
  const adminContext = captureAdminContext();
  const navigation = useNavigation();
  let searchValue = $state('');

  const resources = $derived(getResources());
  const hasAI = $derived(!!(adminContext.agentProvider || adminContext.chatProvider));

  function close() {
    open = false;
    searchValue = '';
  }

  function act(fn: () => void) {
    fn();
    close();
  }

  function askAI() {
    const query = searchValue.trim();
    if (onAskAI && query) {
      onAskAI(query);
    }
    close();
  }

  const itemClass = 'relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[selected]:bg-accent data-[selected]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';
</script>

<Dialog.Dialog bind:open>
  <Dialog.DialogContent class="overflow-hidden p-0 sm:max-w-[560px]">
    <Dialog.DialogTitle class="sr-only">{i18n.t('common.search')}</Dialog.DialogTitle>
    <Command.Root class="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground [&_[data-command-group-heading]]:text-muted-foreground [&_[data-command-group-heading]]:px-2 [&_[data-command-group-heading]]:py-1.5 [&_[data-command-group-heading]]:text-xs [&_[data-command-group-heading]]:font-semibold [&_[data-command-group-heading]]:uppercase [&_[data-command-group-heading]]:tracking-wider">
      <div class="flex items-center border-b px-3" data-cmdk-input-wrapper="">
        <Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <Command.Input
          bind:value={searchValue}
          placeholder={hasAI ? (i18n.t('commandPalette.searchOrAsk') || 'Search or ask AI...') : i18n.t('common.search')}
          class="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        <kbd class="ml-2 text-[10px] font-mono font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">ESC</kbd>
      </div>
      <Command.List class="max-h-[320px] overflow-y-auto overflow-x-hidden p-1">
        <Command.Empty class="py-6 text-center text-sm text-muted-foreground">
          {#if hasAI && searchValue.trim()}
            <button
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer text-sm font-medium"
              onclick={askAI}
            >
              <Sparkles class="h-3.5 w-3.5" />
              {i18n.t('commandPalette.askAI') || 'Ask AI'}: "{searchValue.trim()}"
            </button>
          {:else}
            {i18n.t('common.noData')}
          {/if}
        </Command.Empty>

        <!-- AI -->
        {#if hasAI && searchValue.trim()}
          <Command.Group heading="AI">
            <Command.Item
              value={"ask-ai-" + searchValue}
              onSelect={askAI}
              class={itemClass}
            >
              <Sparkles class="h-4 w-4 text-primary" />
              <span class="text-primary font-medium">{i18n.t('commandPalette.askAI') || 'Ask AI'}</span>
              <span class="text-muted-foreground truncate ml-1">"{searchValue.trim()}"</span>
            </Command.Item>
          </Command.Group>
          <Command.Separator class="mx-1 my-1 h-px bg-border" />
        {/if}

        <!-- Navigation -->
        <Command.Group heading={i18n.t('common.home')}>
          <Command.Item
            value="home"
            onSelect={() => act(() => adminContext.navigate('/'))}
            class={itemClass}
          >
            <LayoutDashboard class="h-4 w-4 text-muted-foreground" />
            {i18n.t('common.home')}
          </Command.Item>
          {#each resources as r, _i (_i)}
            {#if adminContext.accessControlProvider}
              <CanAccess resource={r.name} action="list">
                <Command.Item
                  value={r.name}
                  onSelect={() => act(() => navigation.list(r.name))}
                  class={itemClass}
                >
                  <FileText class="h-4 w-4 text-muted-foreground" />
                  {r.label}
                </Command.Item>
              </CanAccess>
            {:else}
              <Command.Item
                value={r.name}
                onSelect={() => act(() => navigation.list(r.name))}
                class={itemClass}
              >
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
                  <Command.Item value={"create-" + r.name} onSelect={() => act(() => navigation.create(r.name))} class={itemClass}>
                    <Plus class="h-4 w-4 text-muted-foreground" />
                    {i18n.t('common.create')} {r.label}
                  </Command.Item>
                </CanAccess>
              {:else}
                <Command.Item value={"create-" + r.name} onSelect={() => act(() => navigation.create(r.name))} class={itemClass}>
                  <Plus class="h-4 w-4 text-muted-foreground" />
                  {i18n.t('common.create')} {r.label}
                </Command.Item>
              {/if}
            {/if}
          {/each}
          <Command.Item
            value="toggle-theme"
            onSelect={() => act(() => toggleTheme())}
            class={itemClass}
          >
            <Sun class="h-4 w-4 text-muted-foreground" />
            {i18n.t('common.toggleTheme')}
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Dialog.DialogContent>
</Dialog.Dialog>
