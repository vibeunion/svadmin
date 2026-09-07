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

<div class="svadmin-u-b3542e058833">
  <div><h2 class="svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('settings.integrations')}</h2><p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('settings.integrationsDescription')}</p></div>
  <SettingsGroup title={i18n.t('settings.integrations')} description={i18n.t('integrations.addMoreHint')}>
    <div class="svadmin-u-fa6acbf81d74 svadmin-u-e783642739e3">
      {#each displayedIntegrations as integration (integration.id)}
        <SettingsFieldRow label={integration.name} description={integration.description}>
          {#snippet control()}
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c">
              {#if integration.connected !== undefined}
                <StatusBadge status={integration.connected ? 'success' : 'neutral'} label={integration.connected ? i18n.t('integrations.statusConnected') : i18n.t('integrations.statusDisconnected')} />
                {#if onConnectionChange}
                  <Switch checked={integration.connected} onCheckedChange={(checked) => onConnectionChange?.(integration.id, checked)} aria-label={integration.name} />
                {/if}
              {:else}
                <span class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{i18n.t('integrations.statusProvidedByHost')}</span>
              {/if}
            </div>
          {/snippet}
        </SettingsFieldRow>
      {/each}
    </div>
  </SettingsGroup>
</div>
