<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
  import { fly } from 'svelte/transition';
  import { captureAdminContext, getResources, getTheme, getColorTheme } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import TooltipButton from './TooltipButton.svelte';
  import * as Tabs from './ui/tabs/index.js';
  import { Badge } from './ui/badge/index.js';
  import { ScrollArea } from './ui/scroll-area/index.js';
  import { Separator } from './ui/separator/index.js';
  import { X, Bug, ChevronDown, ChevronUp, Wand2 } from '@lucide/svelte';
  import InferencerPanel from './InferencerPanel.svelte';

  const i18n = useTranslation();

  let { docked = false }: { docked?: boolean } = $props();

  const adminContext = captureAdminContext();
  let visible = $state(false);
  let collapsed = $state(false);

  function toggle() {
    visible = !visible;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      toggle();
    }
  }

  const resources = $derived.by(() => { try { return getResources(); } catch { return []; } });
  const path = $derived(adminContext.currentPath());
  const theme = $derived(getTheme());
  const colorTheme = $derived(getColorTheme());
  const locale = $derived(i18n.locale);

</script>

<svelte:window onkeydown={handleKeydown} />

{#if (import.meta as any).env?.DEV}
  {#if visible}
    <div
      class="fixed bottom-0 right-4 z-[9999] w-[420px] max-w-[95vw] rounded-t-xl border border-b-0 bg-card shadow-2xl text-[0.8125rem] overflow-hidden"
      class:w-auto={collapsed} class:min-w-[200px]={collapsed}
      transition:fly={{ y: 400, duration: 300 }}
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-2 bg-muted border-b">
        <div class="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider text-foreground">
          <Bug class="h-4 w-4" />
          <span>svadmin DevTools</span>
        </div>
        <div class="flex gap-1">
          <TooltipButton tooltip={collapsed ? i18n.t('common.expand') : i18n.t('common.collapse')} variant="ghost" size="icon" class="h-6 w-6" onclick={() => collapsed = !collapsed}>
            {#if collapsed}
              <ChevronUp class="h-3.5 w-3.5" />
            {:else}
              <ChevronDown class="h-3.5 w-3.5" />
            {/if}
          </TooltipButton>
          <TooltipButton tooltip={i18n.t('common.close')} variant="ghost" size="icon" class="h-6 w-6" onclick={toggle}>
            <X class="h-3.5 w-3.5" />
          </TooltipButton>
        </div>
      </div>

      {#if !collapsed}
        <Tabs.Root value="state" class="w-full">
          <Tabs.List class="grid w-full grid-cols-2 h-8 rounded-none border-b">
            <Tabs.Trigger value="state" class="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">State</Tabs.Trigger>
            <Tabs.Trigger value="inferencer" class="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              <Wand2 class="h-3 w-3 mr-1" /> Inferencer
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="state" class="p-0">
            <ScrollArea class="max-h-[400px]">
              <div class="p-2 space-y-1">
                <!-- Router -->
                <div class="py-1">
                  <h4 class="text-[0.6875rem] font-bold uppercase tracking-widest text-muted-foreground mb-1 px-1">Router</h4>
                  <div class="flex items-center justify-between px-1 py-0.5 rounded hover:bg-muted/50">
                    <span class="text-xs text-foreground">Path</span>
                    <Badge variant="secondary" class="font-mono text-[0.6875rem]">{path}</Badge>
                  </div>
                </div>

                <Separator />

                <!-- Theme -->
                <div class="py-1">
                  <h4 class="text-[0.6875rem] font-bold uppercase tracking-widest text-muted-foreground mb-1 px-1">Theme</h4>
                  <div class="flex items-center justify-between px-1 py-0.5 rounded hover:bg-muted/50">
                    <span class="text-xs text-foreground">Mode</span>
                    <Badge variant="secondary" class="font-mono text-[0.6875rem]">{theme}</Badge>
                  </div>
                  <div class="flex items-center justify-between px-1 py-0.5 rounded hover:bg-muted/50">
                    <span class="text-xs text-foreground">Color</span>
                    <Badge variant="secondary" class="font-mono text-[0.6875rem]">{colorTheme}</Badge>
                  </div>
                </div>

                <Separator />

                <!-- i18n -->
                <div class="py-1">
                  <h4 class="text-[0.6875rem] font-bold uppercase tracking-widest text-muted-foreground mb-1 px-1">i18n</h4>
                  <div class="flex items-center justify-between px-1 py-0.5 rounded hover:bg-muted/50">
                    <span class="text-xs text-foreground">Locale</span>
                    <Badge variant="secondary" class="font-mono text-[0.6875rem]">{locale}</Badge>
                  </div>
                </div>

                <Separator />

                <!-- Resources -->
                <div class="py-1">
                  <h4 class="text-[0.6875rem] font-bold uppercase tracking-widest text-muted-foreground mb-1 px-1">Resources ({resources.length})</h4>
                  {#each resources as r, _i (_i)}
                    <div class="flex items-center justify-between px-1 py-0.5 rounded hover:bg-muted/50">
                      <span class="text-xs text-foreground">{r.name}</span>
                      <Badge variant="outline" class="font-mono text-[0.6875rem]">{r.fields.length} fields</Badge>
                    </div>
                  {/each}
                </div>
              </div>
            </ScrollArea>
          </Tabs.Content>
          <Tabs.Content value="inferencer" class="p-0">
            <InferencerPanel />
          </Tabs.Content>
        </Tabs.Root>
      {/if}
    </div>
  {:else}
    <TooltipButton
      tooltip={i18n.t('devtools.title')}
      variant="default"
      size="icon"
      class="{docked ? 'relative rounded-md shadow-sm' : 'fixed bottom-5 right-[4.75rem] rounded-full shadow-lg sm:bottom-7 sm:right-[5.5rem]'} z-[9999] h-9 w-9 opacity-60 hover:opacity-100 hover:scale-110 transition-all"
      onclick={toggle}
    >
      <Bug class="h-4 w-4" />
    </TooltipButton>
  {/if}
{/if}
