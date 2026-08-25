<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Cloud, FolderGit, MessageCircle, Plug } from '@lucide/svelte';
  import type { Component } from 'svelte';
  import { Switch } from './ui/switch/index.js';
  import SettingsGroup from './content/SettingsGroup.svelte';
  import SettingsFieldRow from './content/SettingsFieldRow.svelte';
  import StatusBadge from './content/StatusBadge.svelte';

  const i18n = useTranslation();
  interface Integration { id: string; name: string; description: string; connected: boolean; Icon: Component; }
  let integrations = $state<Integration[]>([
    { id: 'source-control', name: 'Source Control', description: 'Sync repository metadata, deployments, and commit activity.', connected: true, Icon: FolderGit },
    { id: 'chatops', name: 'ChatOps', description: 'Send operational alerts and audit summaries to workspace channels.', connected: false, Icon: MessageCircle },
    { id: 'identity-cloud', name: 'Identity Cloud', description: 'Configure SSO and workspace identity handoff.', connected: true, Icon: Cloud },
    { id: 'webhooks', name: 'Webhooks', description: 'Register outbound webhooks for internal tools and monitors.', connected: false, Icon: Plug },
  ]);
  function toggleConnection(id: string, connected: boolean) { integrations = integrations.map((item) => item.id === id ? { ...item, connected } : item); }
</script>

<div class="space-y-6">
  <div><h2 class="text-xl font-semibold text-foreground">{i18n.t('settings.integrations')}</h2><p class="mt-1 text-sm text-muted-foreground">{i18n.t('settings.integrationsDescription')}</p></div>
  <SettingsGroup title={i18n.t('settings.integrations')} description={i18n.t('integrations.addMoreHint')}>
    <div class="divide-y divide-border">
      {#each integrations as integration (integration.id)}
        <SettingsFieldRow label={integration.name} description={integration.description}>
          {#snippet control()}
            <div class="flex items-center gap-3"><StatusBadge status={integration.connected ? 'success' : 'neutral'} label={integration.connected ? i18n.t('integrations.statusConnected') : i18n.t('integrations.statusDisconnected')} /><Switch checked={integration.connected} onCheckedChange={(checked) => toggleConnection(integration.id, checked)} aria-label={integration.name} /></div>
          {/snippet}
        </SettingsFieldRow>
      {/each}
    </div>
  </SettingsGroup>
</div>
