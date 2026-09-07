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

<div class="svadmin-u-b3542e058833">
  <div><h2 class="svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('settings.about')}</h2></div>
  <SettingsGroup title="svadmin" description={i18n.t('settings.currentEnvironment')} bodyClass="space-y-6">
    <DescriptionList columns={2} items={[
      { label: i18n.t('settings.version'), value: version },
      { label: i18n.t('settings.language'), value: i18n.locale },
      { label: i18n.t('settings.themeMode'), value: getResolvedTheme() },
      { label: i18n.t('settings.colorAccent'), value: getColorTheme() },
    ]} />
    <div class="svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-52be28846b5f">
      <h3 class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{i18n.t('settings.registeredResources')}</h3>
      <div class="svadmin-u-eccd13ef4f2f svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-77a2a20e90d4">{#each resources as resource (resource.name)}<Badge variant="outline" class="svadmin-u-0e65706bcccd svadmin-u-359090c2d529">{resource.name}</Badge>{:else}<span class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">—</span>{/each}</div>
    </div>
    <div class="svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-52be28846b5f">
      <h3 class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{i18n.t('settings.dataProvider')}</h3>
      <div class="svadmin-u-eccd13ef4f2f svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-77a2a20e90d4">{#each providerNames as name (name)}<Badge variant="outline" class="svadmin-u-0e65706bcccd svadmin-u-359090c2d529">{name}</Badge>{:else}<span class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">—</span>{/each}</div>
    </div>
  </SettingsGroup>
</div>
