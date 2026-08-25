<script lang="ts">
  import { captureAdminContext, getColorTheme, getResolvedTheme } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge } from './ui/badge/index.js';
  import DescriptionList from './content/DescriptionList.svelte';
  import SettingsGroup from './content/SettingsGroup.svelte';

  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const resources = $derived(adminContext.resources);
  const providerNames = $derived(adminContext.getDataProviderNames());
  const version = '__SVADMIN_VERSION__';
</script>

<div class="space-y-6">
  <div><h2 class="text-xl font-semibold text-foreground">{i18n.t('settings.about')}</h2></div>
  <SettingsGroup title="svadmin" description={i18n.t('settings.currentEnvironment')} bodyClass="space-y-6">
    <DescriptionList columns={2} items={[
      { label: i18n.t('settings.version'), value: version },
      { label: i18n.t('settings.language'), value: i18n.locale },
      { label: i18n.t('settings.themeMode'), value: getResolvedTheme() },
      { label: i18n.t('settings.colorAccent'), value: getColorTheme() },
    ]} />
    <div class="border-t border-border pt-5">
      <h3 class="text-sm font-medium text-foreground">{i18n.t('settings.registeredResources')}</h3>
      <div class="mt-3 flex flex-wrap gap-2">{#each resources as resource (resource.name)}<Badge variant="outline" class="font-mono text-xs">{resource.name}</Badge>{:else}<span class="text-sm text-muted-foreground">—</span>{/each}</div>
    </div>
    <div class="border-t border-border pt-5">
      <h3 class="text-sm font-medium text-foreground">{i18n.t('settings.dataProvider')}</h3>
      <div class="mt-3 flex flex-wrap gap-2">{#each providerNames as name (name)}<Badge variant="outline" class="font-mono text-xs">{name}</Badge>{:else}<span class="text-sm text-muted-foreground">—</span>{/each}</div>
    </div>
  </SettingsGroup>
</div>
