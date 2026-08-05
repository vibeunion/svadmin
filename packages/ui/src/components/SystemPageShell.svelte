<script lang="ts">
  import type { Snippet } from 'svelte';
  import { captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { ArrowLeft } from '@lucide/svelte';
  import SvadminLogo from './SvadminLogo.svelte';
  import { Button } from './ui/button/index.js';

  let { title = 'svadmin', children }: { title?: string; children: Snippet } = $props();

  const adminContext = captureAdminContext();
  const i18n = useTranslation();
</script>

<div class="min-h-screen bg-background text-foreground">
  <header class="flex h-[70px] items-center justify-between border-b border-border/60 px-4 sm:px-6">
    <button
      type="button"
      class="inline-flex items-center gap-2.5 text-sm font-semibold"
      onclick={() => adminContext.navigate('/')}
    >
      <SvadminLogo size={30} />
      <span>{title}</span>
    </button>
    <Button variant="ghost" size="sm" onclick={() => adminContext.back()}>
      <ArrowLeft class="h-4 w-4" />
      <span class="hidden sm:inline">{i18n.t('common.back')}</span>
    </Button>
  </header>

  <main class="min-h-[calc(100vh-70px)] bg-muted/20 px-3 py-5 sm:px-6 sm:py-8">
    {@render children()}
  </main>
</div>
