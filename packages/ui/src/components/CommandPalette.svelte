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
  const hasAI = $derived(
    !!(adminContext.agentProvider || adminContext.chatProvider) && typeof onAskAI === 'function',
  );

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

  const itemClass = 'svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-50ca6ba56aa3 svadmin-u-77a2a20e90d4 svadmin-u-7f6912283f11 svadmin-u-3960ffc248d9 svadmin-u-36d4469299aa svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-fc7473ca09eb svadmin-u-df37b1fd9495 svadmin-u-99afb1cc3b47 svadmin-u-529780e25268 svadmin-u-8e0c223ba976 svadmin-u-7c865b678f08';
</script>

<Dialog.Dialog bind:open>
  <Dialog.DialogContent class="svadmin-u-2cd02d11d1af svadmin-u-8a539c7fe216 svadmin-u-ba002e28b7ba">
    <Dialog.DialogTitle class="svadmin-u-2daa8e5e2f2e">{i18n.t('common.search')}</Dialog.DialogTitle>
    <Command.Root class="svadmin-u-60fbb7713999 svadmin-u-668b21aa5409 svadmin-u-6da6a3c3f741 svadmin-u-8dddea0773ed svadmin-u-2cd02d11d1af svadmin-u-421ac2be5045 svadmin-u-e541d86d1ec8 svadmin-u-9b13e8ae5c9c svadmin-u-08539b5283eb svadmin-u-b3501a4e31c3 svadmin-u-e75a50203550 svadmin-u-a8f5f59f5cda svadmin-u-90f5ed09ba83 [&_[data-command-group-heading]]:uppercase svadmin-u-8b809ad2310b">
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-65fdbade2025 svadmin-u-0e17f2bd9074" data-cmdk-input-wrapper="">
        <Search class="svadmin-u-d2347e8497a9 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-012fbd121f37 svadmin-u-0b8c506a0596" />
        <Command.Input
          bind:value={searchValue}
          placeholder={hasAI ? (i18n.t('commandPalette.searchOrAsk') || 'Search or ask AI...') : i18n.t('common.search')}
          class="svadmin-u-60fbb7713999 svadmin-u-f82f0c255ad9 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-7f19cdf4c5bb svadmin-u-1b2d54a3fd12 svadmin-u-fc7473ca09eb svadmin-u-df37b1fd9495 svadmin-u-9c24ab70af61 svadmin-u-5f533b3a7de7 svadmin-u-b29d8adbad2e"
        />
        <kbd class="svadmin-u-c68af9986751 svadmin-u-1dc571a3609f svadmin-u-0e65706bcccd svadmin-u-2689f3958069 svadmin-u-bfa603190748 svadmin-u-2ef11f1cb219 svadmin-u-45d828117213 svadmin-u-465609a240a8 svadmin-u-07389a777c1f svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af">ESC</kbd>
      </div>
      <Command.List class="svadmin-u-fd9aebd23c39 svadmin-u-92bf82f493b1 svadmin-u-e271e6ae16dc svadmin-u-eb6a3cef9686">
        <Command.Empty class="svadmin-u-940911bf310c svadmin-u-ca6bf63030aa svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">
          {#if hasAI && searchValue.trim()}
            <button
              class="svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568 svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-421ac2be5045 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-7f9a026b5897 svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d svadmin-u-fc7473ca09eb svadmin-u-2689f3958069"
              onclick={askAI}
            >
              <Sparkles class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
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
              <Sparkles class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-20aaf08a7ed1" />
              <span class="svadmin-u-20aaf08a7ed1 svadmin-u-2689f3958069">{i18n.t('commandPalette.askAI') || 'Ask AI'}</span>
              <span class="svadmin-u-bfa603190748 svadmin-u-f283ea9bea0e svadmin-u-f58b02572ab2">"{searchValue.trim()}"</span>
            </Command.Item>
          </Command.Group>
          <Command.Separator class="svadmin-u-0da48290f782 svadmin-u-93b32079b969 svadmin-u-aea6160836e7 svadmin-u-a59afa8d9b9d" />
        {/if}

        <!-- Navigation -->
        <Command.Group heading={i18n.t('common.home')}>
          <Command.Item
            value="home"
            onSelect={() => act(() => adminContext.navigate('/'))}
            class={itemClass}
          >
            <LayoutDashboard class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />
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
                  <FileText class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />
                  {r.label}
                </Command.Item>
              </CanAccess>
            {:else}
              <Command.Item
                value={r.name}
                onSelect={() => act(() => navigation.list(r.name))}
                class={itemClass}
              >
                <FileText class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />
                {r.label}
              </Command.Item>
            {/if}
          {/each}
        </Command.Group>

        <Command.Separator class="svadmin-u-0da48290f782 svadmin-u-93b32079b969 svadmin-u-aea6160836e7 svadmin-u-a59afa8d9b9d" />

        <!-- Actions -->
        <Command.Group heading={i18n.t('common.actions')}>
          {#each resources as r, _i (_i)}
            {#if r.canCreate !== false}
              {#if adminContext.accessControlProvider}
                <CanAccess resource={r.name} action="create">
                  <Command.Item value={"create-" + r.name} onSelect={() => act(() => navigation.create(r.name))} class={itemClass}>
                    <Plus class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />
                    {i18n.t('common.create')} {r.label}
                  </Command.Item>
                </CanAccess>
              {:else}
                <Command.Item value={"create-" + r.name} onSelect={() => act(() => navigation.create(r.name))} class={itemClass}>
                  <Plus class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />
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
            <Sun class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />
            {i18n.t('common.toggleTheme')}
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Dialog.DialogContent>
</Dialog.Dialog>
