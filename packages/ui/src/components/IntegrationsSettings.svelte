<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Cloud, FolderGit, MessageCircle, Plug } from '@lucide/svelte';
  import type { Component } from 'svelte';
  import { Switch } from './ui/switch/index.js';
  import SettingsGroup from './content/SettingsGroup.svelte';
  import SettingsFieldRow from './content/SettingsFieldRow.svelte';
  import StatusBadge from './content/StatusBadge.svelte';

  const i18n = useTranslation();

  interface Integration {
    id: string;
    name: string;
    description: string;
    connected?: boolean;
    Icon: Component;
  }

  interface Props {
    integrations?: Integration[];
    onConnectionChange?: (id: string, connected: boolean) => void | Promise<void>;
  }

  let { integrations, onConnectionChange }: Props = $props();
  const defaultIntegrations = $derived<Integration[]>([
    { id: 'source-control', name: i18n.t('integrations.sourceControl'), description: i18n.t('integrations.sourceControlDescription'), Icon: FolderGit },
    { id: 'chatops', name: 'ChatOps', description: i18n.t('integrations.chatOpsDescription'), Icon: MessageCircle },
    { id: 'identity-cloud', name: i18n.t('integrations.identityCloud'), description: i18n.t('integrations.identityCloudDescription'), Icon: Cloud },
    { id: 'webhooks', name: 'Webhooks', description: i18n.t('integrations.webhooksDescription'), Icon: Plug },
  ]);
  const displayedIntegrations = $derived(integrations ?? defaultIntegrations);
</script>

<div class="space-y-6">
  <div><h2 class="text-xl font-semibold text-foreground">{i18n.t('settings.integrations')}</h2><p class="mt-1 text-sm text-muted-foreground">{i18n.t('settings.integrationsDescription')}</p></div>
  <SettingsGroup title={i18n.t('settings.integrations')} description={i18n.t('integrations.addMoreHint')}>
    <div class="divide-y divide-border">
      {#each displayedIntegrations as integration (integration.id)}
        <SettingsFieldRow label={integration.name} description={integration.description}>
          {#snippet control()}
            <div class="flex items-center gap-3">
              {#if integration.connected !== undefined}
                <StatusBadge status={integration.connected ? 'success' : 'neutral'} label={integration.connected ? i18n.t('integrations.statusConnected') : i18n.t('integrations.statusDisconnected')} />
                {#if onConnectionChange}
                  <Switch checked={integration.connected} onCheckedChange={(checked) => onConnectionChange?.(integration.id, checked)} aria-label={integration.name} />
                {/if}
              {:else}
                <span class="text-xs text-muted-foreground">{i18n.t('integrations.statusProvidedByHost')}</span>
              {/if}
            </div>
          {/snippet}
        </SettingsFieldRow>
      {/each}
    </div>
  </SettingsGroup>
</div>
