<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Check, Copy, Plus, ShieldCheck, Trash2 } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { Checkbox } from './ui/checkbox/index.js';
  import { Input } from './ui/input/index.js';
  import { Label } from './ui/label/index.js';
  import ApiKeyList from './content/ApiKeyList.svelte';
  import ContentPageShell from './content/ContentPageShell.svelte';
  import DataState from './content/DataState.svelte';
  import SettingsGroup from './content/SettingsGroup.svelte';
  import WorkspaceLayout from './content/WorkspaceLayout.svelte';

  const i18n = useTranslation();
  interface ApiKey { id: string; name: string; maskedToken: string; created: string; permissions: string[]; }
  interface WebhookEntry { id: string; name: string; url: string; eventType: string; }
  let keys = $state<ApiKey[]>([
    { id: 'prod-sync', name: 'Production Sync Service', maskedToken: 'sv_demo_prod_••••_4d3e', created: '2026-03-10', permissions: ['Read', 'Write'] },
    { id: 'reporting', name: 'Internal Reporting Tool', maskedToken: 'sv_demo_report_••••_9e8f', created: '2026-05-18', permissions: ['Read'] },
  ]);
  let newKeyName = $state('');
  let newKeyPermissions = $state({ Read: true, Write: false, Delete: false, Admin: false });
  let generatedToken = $state('');
  let showCreatedToken = $state(false);
  let copiedKeyId = $state<string | null>(null);
  let webhooks = $state<WebhookEntry[]>([{ id: 'wh-1', name: 'Order Events', url: 'https://api.acme.com/hooks/orders', eventType: 'resource.updated' }]);
  let newWebhookName = $state('');
  let newWebhookUrl = $state('');
  let newWebhookEvent = $state('resource.created');

  function handleAddWebhook(event: SubmitEvent) {
    event.preventDefault();
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) return;
    webhooks = [...webhooks, { id: Date.now().toString(), name: newWebhookName.trim(), url: newWebhookUrl.trim(), eventType: newWebhookEvent }];
    newWebhookName = '';
    newWebhookUrl = '';
  }
  function generateDemoToken() { return `sv_demo_${Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`; }
  function handleGenerateKey(event: SubmitEvent) {
    event.preventDefault();
    if (!newKeyName.trim()) return;
    const token = generateDemoToken();
    const permissions = Object.entries(newKeyPermissions).filter(([, enabled]) => enabled).map(([name]) => name);
    keys = [...keys, { id: Date.now().toString(), name: newKeyName.trim(), maskedToken: `${token.slice(0, 14)}••••${token.slice(-4)}`, created: new Date().toISOString().split('T')[0], permissions }];
    generatedToken = token;
    showCreatedToken = true;
    newKeyName = '';
    newKeyPermissions = { Read: true, Write: false, Delete: false, Admin: false };
  }
  function deleteKey(id: string) { keys = keys.filter((key) => key.id !== id); }
  async function copyToken(token: string, id: string) {
    try {
      await navigator.clipboard.writeText(token);
      copiedKeyId = id;
      setTimeout(() => { if (copiedKeyId === id) copiedKeyId = null; }, 2000);
    } catch { copiedKeyId = null; }
  }
</script>

<ContentPageShell pageId="api-settings" width="wide" title={i18n.t('settings.api')} description={i18n.t('settings.apiDescription')}>
  <WorkspaceLayout secondaryWidth="21rem">
    {#snippet summary()}
      {#if showCreatedToken}
        <section class="rounded-lg border border-primary/20 bg-primary/5 p-4" role="status" aria-live="polite">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex min-w-0 items-start gap-3"><ShieldCheck class="mt-0.5 size-5 shrink-0 text-primary" /><div class="min-w-0"><h2 class="text-sm font-semibold text-foreground">{i18n.t('api.successTitle')}</h2><p class="mt-1 text-sm text-muted-foreground">{i18n.t('api.successHint')}</p></div></div>
            <Button variant="ghost" size="sm" onclick={() => { showCreatedToken = false; generatedToken = ''; }}>{i18n.t('common.close')}</Button>
          </div>
          <div class="mt-4 flex min-w-0 items-center gap-2"><Input readonly value={generatedToken} class="min-w-0 font-mono text-xs" aria-label={i18n.t('api.successTitle')} /><Button size="icon" onclick={() => copyToken(generatedToken, 'new-token')} aria-label={i18n.t('common.copy')}>{#if copiedKeyId === 'new-token'}<Check class="size-4" />{:else}<Copy class="size-4" />{/if}</Button></div>
        </section>
      {/if}
    {/snippet}
    {#snippet primary()}
      <div class="space-y-6">
        <SettingsGroup title={i18n.t('api.activeKeysTitle')} description={i18n.t('api.activeKeysDesc')} bodyClass="p-0">
          <ApiKeyList class="rounded-none border-0" keys={keys.map((key) => ({ id: key.id, name: key.name, prefix: key.maskedToken, maskedToken: key.maskedToken, createdAt: key.created, permissions: key.permissions }))} stateTitle={i18n.t('api.noKeys')} stateDescription={i18n.t('api.generateDesc')} {copiedKeyId} oncopy={(key) => copyToken(key.maskedToken ?? key.prefix, key.id)} onrevoke={(key) => deleteKey(key.id)} />
        </SettingsGroup>
        <SettingsGroup title={i18n.t('api.webhooks')} description={i18n.t('api.webhooksDesc')} bodyClass="space-y-5">
          <form class="grid min-w-0 gap-4 md:grid-cols-2" onsubmit={handleAddWebhook}>
            <div class="space-y-2"><Label for="webhook-name">{i18n.t('api.webhookName')}</Label><Input id="webhook-name" bind:value={newWebhookName} placeholder="Order Events" /></div>
            <div class="space-y-2"><Label for="webhook-url">{i18n.t('api.webhookUrl')}</Label><Input id="webhook-url" type="url" bind:value={newWebhookUrl} placeholder="https://api.example.com/hooks" /></div>
            <div class="space-y-2"><Label for="webhook-event">{i18n.t('api.eventType')}</Label><select id="webhook-event" bind:value={newWebhookEvent} class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"><option value="resource.created">resource.created</option><option value="resource.updated">resource.updated</option><option value="resource.deleted">resource.deleted</option><option value="auth.login">auth.login</option></select></div>
            <div class="flex items-end"><Button type="submit" class="w-full" disabled={!newWebhookName.trim() || !newWebhookUrl.trim()}><Plus class="size-4" />{i18n.t('api.addWebhook')}</Button></div>
          </form>
          {#if webhooks.length === 0}
            <DataState state="empty" title={i18n.t('api.noWebhooks')} description={i18n.t('api.webhooksDesc')} />
          {:else}
            <div class="divide-y divide-border border-t border-border">{#each webhooks as hook (hook.id)}<div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div class="min-w-0"><p class="text-sm font-medium text-foreground">{hook.name}</p><p class="truncate font-mono text-xs text-muted-foreground">{hook.url}</p></div><div class="flex items-center justify-between gap-3 sm:justify-end"><span class="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">{hook.eventType}</span><Button variant="ghost" size="icon-sm" onclick={() => { webhooks = webhooks.filter((entry) => entry.id !== hook.id); }} aria-label={i18n.t('common.delete') + ' ' + hook.name}><Trash2 class="size-4" /></Button></div></div>{/each}</div>
          {/if}
        </SettingsGroup>
      </div>
    {/snippet}
    {#snippet secondary()}
      <SettingsGroup title={i18n.t('api.generateTitle')} description={i18n.t('api.generateDesc')}>
        <form onsubmit={handleGenerateKey} class="space-y-5"><div class="space-y-2"><Label for="api-key-name">{i18n.t('api.keyName')}</Label><Input id="api-key-name" placeholder="CI deployment token" bind:value={newKeyName} required /></div><fieldset class="space-y-3"><legend class="text-sm font-medium text-foreground">{i18n.t('api.permissions')}</legend>{#each Object.keys(newKeyPermissions) as permission (permission)}<div class="flex items-center gap-2"><Checkbox id={`perm-${permission}`} bind:checked={newKeyPermissions[permission as keyof typeof newKeyPermissions]} /><Label for={`perm-${permission}`} class="cursor-pointer text-sm font-normal">{permission}</Label></div>{/each}</fieldset><Button type="submit" class="w-full">{i18n.t('api.generateButton')}</Button></form>
      </SettingsGroup>
    {/snippet}
  </WorkspaceLayout>
</ContentPageShell>
