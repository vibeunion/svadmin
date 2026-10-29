<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { AlertTriangle, Copy, CheckCircle } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import TooltipButton from './TooltipButton.svelte';
  import * as Card from './ui/card/index.js';

  const i18n = useTranslation();

  let { title, missingVars = [], envTemplate = '' } = $props<{
    title?: string;
    missingVars?: { key: string; description?: string }[];
    envTemplate?: string;
  }>();

  const displayTitle = $derived(title ?? i18n.t('config.missingEnvTitle'));

  let copied = $state<Record<string, boolean>>({});
  let copyTimers = $state<Record<string, ReturnType<typeof setTimeout>>>({});

  function setCopied(key: string) {
    copied = { ...copied, [key]: true };
    // Clear previous timer for this key if any
    if (copyTimers[key]) clearTimeout(copyTimers[key]);
    const timer = setTimeout(() => {
      copied = { ...copied, [key]: false };
    }, 2000);
    copyTimers = { ...copyTimers, [key]: timer };
  }

  // Cleanup all timers on destroy
  $effect(() => {
    return () => {
      Object.values(copyTimers).forEach(clearTimeout);
    };
  });

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      console.warn('[svadmin] clipboard API unavailable');
    }
  }

  async function copyAll() {
    const text = envTemplate || missingVars.map((v: { key: string }) => `${v.key}=`).join('\n');
    await copyToClipboard(text, '__all__');
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-background p-4">
  <div class="w-full max-w-[480px]">
    <Card.Card>
      <Card.CardHeader class="text-center pb-2">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-destructive/10 text-destructive mx-auto mb-3">
          <AlertTriangle class="h-6 w-6" />
        </div>
        <Card.CardTitle class="text-xl">{displayTitle}</Card.CardTitle>
        <p class="text-sm text-muted-foreground">
          {i18n.t('config.missingEnvDescription')}
        </p>
      </Card.CardHeader>
      <Card.CardContent class="space-y-4">
        {#if missingVars.length > 0}
          <div class="rounded-lg border overflow-hidden">
            {#each missingVars as v, i (v.key)}
              <div class="flex items-center justify-between px-3 py-2.5 gap-2 {i < missingVars.length - 1 ? 'border-b border-border/50' : ''}">
                <div class="flex flex-col gap-0.5 min-w-0">
                  <code class="text-[0.8125rem] font-semibold text-foreground font-mono">{v.key}</code>
                  {#if v.description}
                    <span class="text-[0.6875rem] text-muted-foreground">{v.description}</span>
                  {/if}
                </div>
                <TooltipButton
                  tooltip={i18n.t('common.copy')}
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 shrink-0"
                  onclick={() => copyToClipboard(`${v.key}=`, v.key)}
                >
                  {#if copied[v.key]}
                    <CheckCircle class="h-3.5 w-3.5 text-success" />
                  {:else}
                    <Copy class="h-3.5 w-3.5" />
                  {/if}
                </TooltipButton>
              </div>
            {/each}
          </div>
        {/if}

        {#if envTemplate}
          <div class="rounded-lg border overflow-hidden">
            <div class="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border/50">
              <span class="text-xs font-medium text-muted-foreground">{i18n.t('config.envFilePath')}</span>
              <TooltipButton
                tooltip={i18n.t('common.copyAll')}
                variant="ghost"
                size="sm"
                class="h-7 gap-1"
                onclick={copyAll}
              >
                {#if copied['__all__']}
                  <CheckCircle class="h-3.5 w-3.5 text-success" />
                  <span class="text-xs">{i18n.t('common.copied')}</span>
                {:else}
                  <Copy class="h-3.5 w-3.5" />
                  <span class="text-xs">{i18n.t('common.copyAll')}</span>
                {/if}
              </TooltipButton>
            </div>
            <pre class="px-3 py-3 text-xs font-mono leading-relaxed text-foreground bg-muted/20 m-0 whitespace-pre-wrap break-all">{envTemplate}</pre>
          </div>
        {/if}

        <p class="text-xs text-muted-foreground text-center mt-4">
          {i18n.t('config.reload')}
        </p>

        <Button variant="outline" class="w-full" onclick={() => window.location.reload()}>
          {i18n.t('config.reloadButton')}
        </Button>
      </Card.CardContent>
    </Card.Card>
  </div>
</div>
