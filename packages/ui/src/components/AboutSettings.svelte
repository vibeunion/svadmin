<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { captureAdminContext } from '@svadmin/core';
  import { getResolvedTheme, getColorTheme } from '@svadmin/core';
  import * as Card from './ui/card/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Info, Database, Globe, Palette, Layers } from '@lucide/svelte';

  const i18n = useTranslation();
  const adminContext = captureAdminContext();

  const resources = $derived(adminContext.resources);
  const providerNames = $derived(adminContext.getDataProviderNames());

  const version = '__SVADMIN_VERSION__'; // replaced at build time or shown as-is
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-xl font-semibold text-foreground">{i18n.t('settings.about')}</h2>
  </div>

  <!-- Version -->
  <Card.Card>
    <Card.CardHeader class="pb-3">
      <Card.CardTitle class="text-base flex items-center gap-2">
        <Info class="h-4 w-4 text-muted-foreground" />
        svadmin
      </Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent>
      <div class="grid gap-4 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">{i18n.t('settings.version')}</span>
          <Badge variant="secondary" class="font-mono text-xs">{version}</Badge>
        </div>
      </div>
    </Card.CardContent>
  </Card.Card>

  <!-- Registered Resources -->
  <Card.Card>
    <Card.CardHeader class="pb-3">
      <Card.CardTitle class="text-base flex items-center gap-2">
        <Layers class="h-4 w-4 text-muted-foreground" />
        {i18n.t('settings.registeredResources')}
      </Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent>
      <div class="flex flex-wrap gap-2">
        {#each resources as resource, _i (_i)}
          <Badge variant="outline" class="font-mono text-xs">{resource.name}</Badge>
        {/each}
        {#if resources.length === 0}
          <p class="text-sm text-muted-foreground">—</p>
        {/if}
      </div>
    </Card.CardContent>
  </Card.Card>

  <!-- Data Providers -->
  <Card.Card>
    <Card.CardHeader class="pb-3">
      <Card.CardTitle class="text-base flex items-center gap-2">
        <Database class="h-4 w-4 text-muted-foreground" />
        {i18n.t('settings.dataProvider')}
      </Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent>
      <div class="flex flex-wrap gap-2">
        {#each providerNames as name, _i (_i)}
          <Badge variant="outline" class="font-mono text-xs">{name}</Badge>
        {/each}
      </div>
    </Card.CardContent>
  </Card.Card>

  <!-- Current Environment -->
  <Card.Card>
    <Card.CardHeader class="pb-3">
      <Card.CardTitle class="text-base flex items-center gap-2">
        <Globe class="h-4 w-4 text-muted-foreground" />
        {i18n.t('settings.currentEnvironment')}
      </Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent>
      <div class="grid gap-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">{i18n.t('settings.language')}</span>
          <span class="font-mono text-xs">{i18n.locale}</span>
        </div>
        <div class="h-px bg-border"></div>
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">{i18n.t('settings.themeMode')}</span>
          <span class="font-mono text-xs">{getResolvedTheme()}</span>
        </div>
        <div class="h-px bg-border"></div>
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground flex items-center gap-1.5">
            <Palette class="h-3.5 w-3.5" />
            {i18n.t('settings.colorAccent')}
          </span>
          <span class="font-mono text-xs">{getColorTheme()}</span>
        </div>
      </div>
    </Card.CardContent>
  </Card.Card>
</div>
