<script lang="ts">
  import { captureAdminContext, notifyWithProvider, type ApiCredentialSummary, type WebhookSummary } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Check, Copy, Plus, ShieldCheck, Trash2 } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { Checkbox } from './ui/checkbox/index.js';
  import { Input } from './ui/input/index.js';
  import { Label } from './ui/label/index.js';
  import ApiKeyList from './content/ApiKeyList.svelte';
  import ContentPageShell from './content/ContentPageShell.svelte';
  import DataState from './content/DataState.svelte';
  import FeedbackNotice from './content/FeedbackNotice.svelte';
  import SettingsGroup from './content/SettingsGroup.svelte';
  import WorkspaceLayout from './content/WorkspaceLayout.svelte';

  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const credentialProvider = $derived(adminContext.credentialProvider);
  const isZh = $derived(i18n.locale === 'zh-CN');

  let keys = $state.raw<ApiCredentialSummary[]>([]);
  let webhooks = $state.raw<WebhookSummary[]>([]);
  let newKeyName = $state('');
  let newKeyPermissions = $state({ Read: true, Write: false, Delete: false, Admin: false });
  let generatedSecret = $state('');
  let copied = $state(false);
  let newWebhookName = $state('');
  let newWebhookUrl = $state('');
  let newWebhookEvent = $state('resource.created');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let submitting = $state(false);
  let requestId = 0;

  function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  async function loadCredentials(): Promise<void> {
    const currentRequest = ++requestId;
    const provider = credentialProvider;
    const context = adminContext.enterpriseRequestContext;
    keys = [];
    webhooks = [];
    generatedSecret = '';
    copied = false;
    error = null;
    loading = false;
    submitting = false;
    if (!provider) return;
    loading = true;
    try {
      const [nextKeys, nextWebhooks] = await Promise.all([provider.listApiCredentials(context), provider.listWebhooks(context)]);
      if (currentRequest !== requestId) return;
      keys = nextKeys;
      webhooks = nextWebhooks;
    } catch (caught) {
      if (currentRequest === requestId) error = message(caught);
    } finally {
      if (currentRequest === requestId) loading = false;
    }
  }

  $effect(() => {
    void credentialProvider;
    void adminContext.tenantCacheKey?.__svadminTenant;
    void loadCredentials();
    return () => { requestId += 1; };
  });

  async function handleAddWebhook(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const provider = credentialProvider;
    const currentRequest = requestId;
    const context = adminContext.enterpriseRequestContext;
    if (!provider || !newWebhookName.trim() || !newWebhookUrl.trim()) return;
    submitting = true;
    try {
      const webhook = await provider.createWebhook({ name: newWebhookName.trim(), url: newWebhookUrl.trim(), eventType: newWebhookEvent }, context);
      if (currentRequest !== requestId) return;
      webhooks = [...webhooks, webhook];
      newWebhookName = '';
      newWebhookUrl = '';
    } catch (caught) {
      if (currentRequest !== requestId) return;
      notifyWithProvider({ type: 'error', message: message(caught) }, adminContext.notificationProvider);
    } finally {
      if (currentRequest === requestId) submitting = false;
    }
  }

  async function handleGenerateKey(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const provider = credentialProvider;
    const currentRequest = requestId;
    const context = adminContext.enterpriseRequestContext;
    if (!provider || !newKeyName.trim()) return;
    submitting = true;
    try {
      const permissions = Object.entries(newKeyPermissions).filter(([, enabled]) => enabled).map(([name]) => name);
      const created = await provider.createApiCredential({ name: newKeyName.trim(), permissions }, context);
      if (currentRequest !== requestId) return;
      keys = [...keys, created.credential];
      generatedSecret = created.secret;
      copied = false;
      newKeyName = '';
      newKeyPermissions = { Read: true, Write: false, Delete: false, Admin: false };
    } catch (caught) {
      if (currentRequest !== requestId) return;
      notifyWithProvider({ type: 'error', message: message(caught) }, adminContext.notificationProvider);
    } finally {
      if (currentRequest === requestId) submitting = false;
    }
  }

  async function revokeKey(id: string): Promise<void> {
    const provider = credentialProvider;
    const currentRequest = requestId;
    const context = adminContext.enterpriseRequestContext;
    if (!provider) return;
    try {
      const result = await provider.revokeApiCredential(id, context);
      if (!result.success) throw new Error(result.error?.message ?? (isZh ? '密钥撤销失败' : 'Credential revocation failed'));
      if (currentRequest !== requestId) return;
      keys = keys.filter((key) => key.id !== id);
    } catch (caught) {
      if (currentRequest !== requestId) return;
      notifyWithProvider({ type: 'error', message: message(caught) }, adminContext.notificationProvider);
    }
  }

  async function deleteWebhook(id: string): Promise<void> {
    const provider = credentialProvider;
    const currentRequest = requestId;
    const context = adminContext.enterpriseRequestContext;
    if (!provider) return;
    try {
      const result = await provider.deleteWebhook(id, context);
      if (!result.success) throw new Error(result.error?.message ?? (isZh ? 'Webhook 删除失败' : 'Webhook deletion failed'));
      if (currentRequest !== requestId) return;
      webhooks = webhooks.filter((webhook) => webhook.id !== id);
    } catch (caught) {
      if (currentRequest !== requestId) return;
      notifyWithProvider({ type: 'error', message: message(caught) }, adminContext.notificationProvider);
    }
  }

  async function copySecret(): Promise<void> {
    try {
      await navigator.clipboard.writeText(generatedSecret);
      copied = true;
    } catch {
      copied = false;
    }
  }
</script>

<ContentPageShell pageId="api-settings" width="wide" title={i18n.t('settings.api')} description={i18n.t('settings.apiDescription')}>
  {#if !credentialProvider}<FeedbackNotice tone="warning" message={isZh ? '未配置 CredentialProvider。页面不会在浏览器内生成假密钥或假 Webhook。' : 'CredentialProvider is not configured. This page does not generate simulated browser credentials or webhooks.'} />{/if}
  <WorkspaceLayout secondaryWidth="21rem">
    {#snippet summary()}
      {#if generatedSecret}
        <section class="rounded-lg border border-primary/20 bg-primary/5 p-4" role="status" aria-live="polite">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div class="flex min-w-0 items-start gap-3"><ShieldCheck class="mt-0.5 size-5 shrink-0 text-primary" /><div class="min-w-0"><h2 class="text-sm font-semibold text-foreground">{i18n.t('api.successTitle')}</h2><p class="mt-1 text-sm text-muted-foreground">{i18n.t('api.successHint')}</p></div></div><Button variant="ghost" size="sm" onclick={() => { generatedSecret = ''; copied = false; }}>{i18n.t('common.close')}</Button></div>
          <div class="mt-4 flex min-w-0 items-center gap-2"><Input readonly value={generatedSecret} class="min-w-0 font-mono text-xs" aria-label={i18n.t('api.successTitle')} /><Button size="icon" onclick={copySecret} aria-label={i18n.t('common.copy')}>{#if copied}<Check class="size-4" />{:else}<Copy class="size-4" />{/if}</Button></div>
        </section>
      {/if}
    {/snippet}
    {#snippet primary()}
      <div class="space-y-6">
        <SettingsGroup title={i18n.t('api.activeKeysTitle')} description={i18n.t('api.activeKeysDesc')} bodyClass="p-0">
          {#if loading}<DataState state="loading" />{:else if error}<DataState state="error" description={error} retry={loadCredentials} />{:else}<ApiKeyList class="rounded-none border-0" keys={keys.map((key) => ({ id: key.id, name: key.name, prefix: key.prefix, createdAt: new Date(key.createdAt).toLocaleString(), lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : undefined, permissions: key.permissions }))} stateTitle={i18n.t('api.noKeys')} stateDescription={credentialProvider ? i18n.t('api.generateDesc') : (isZh ? '配置 CredentialProvider 后可管理真实凭据。' : 'Configure CredentialProvider to manage real credentials.')} onrevoke={credentialProvider ? (key) => revokeKey(key.id) : undefined} />{/if}
        </SettingsGroup>
        <SettingsGroup title={i18n.t('api.webhooks')} description={i18n.t('api.webhooksDesc')} bodyClass="space-y-5">
          <form class="grid min-w-0 gap-4 md:grid-cols-2" onsubmit={handleAddWebhook}><div class="space-y-2"><Label for="webhook-name">{i18n.t('api.webhookName')}</Label><Input id="webhook-name" bind:value={newWebhookName} placeholder="Order Events" disabled={!credentialProvider || submitting} /></div><div class="space-y-2"><Label for="webhook-url">{i18n.t('api.webhookUrl')}</Label><Input id="webhook-url" type="url" bind:value={newWebhookUrl} placeholder="https://api.example.com/hooks" disabled={!credentialProvider || submitting} /></div><div class="space-y-2"><Label for="webhook-event">{i18n.t('api.eventType')}</Label><select id="webhook-event" bind:value={newWebhookEvent} disabled={!credentialProvider || submitting} class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"><option value="resource.created">resource.created</option><option value="resource.updated">resource.updated</option><option value="resource.deleted">resource.deleted</option><option value="auth.login">auth.login</option></select></div><div class="flex items-end"><Button type="submit" class="w-full" disabled={!credentialProvider || submitting || !newWebhookName.trim() || !newWebhookUrl.trim()}><Plus class="size-4" />{i18n.t('api.addWebhook')}</Button></div></form>
          {#if webhooks.length === 0}<DataState state="empty" title={i18n.t('api.noWebhooks')} description={credentialProvider ? i18n.t('api.webhooksDesc') : (isZh ? '配置 CredentialProvider 后可管理真实 Webhook。' : 'Configure CredentialProvider to manage real webhooks.')} />{:else}<div class="divide-y divide-border border-t border-border">{#each webhooks as hook (hook.id)}<div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div class="min-w-0"><p class="text-sm font-medium text-foreground">{hook.name}</p><p class="truncate font-mono text-xs text-muted-foreground">{hook.url}</p></div><div class="flex items-center justify-between gap-3 sm:justify-end"><span class="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">{hook.eventType}</span><Button variant="ghost" size="icon-sm" onclick={() => deleteWebhook(hook.id)} aria-label={i18n.t('common.delete') + ' ' + hook.name}><Trash2 class="size-4" /></Button></div></div>{/each}</div>{/if}
        </SettingsGroup>
      </div>
    {/snippet}
    {#snippet secondary()}
      <SettingsGroup title={i18n.t('api.generateTitle')} description={i18n.t('api.generateDesc')}>
        <form onsubmit={handleGenerateKey} class="space-y-5"><div class="space-y-2"><Label for="api-key-name">{i18n.t('api.keyName')}</Label><Input id="api-key-name" placeholder="CI deployment token" bind:value={newKeyName} required disabled={!credentialProvider || submitting} /></div><fieldset class="space-y-3" disabled={!credentialProvider || submitting}><legend class="text-sm font-medium text-foreground">{i18n.t('api.permissions')}</legend>{#each Object.keys(newKeyPermissions) as permission (permission)}<div class="flex items-center gap-2"><Checkbox id={`perm-${permission}`} bind:checked={newKeyPermissions[permission as keyof typeof newKeyPermissions]} /><Label for={`perm-${permission}`} class="cursor-pointer text-sm font-normal">{permission}</Label></div>{/each}</fieldset><Button type="submit" class="w-full" disabled={!credentialProvider || submitting || !newKeyName.trim()}>{i18n.t('api.generateButton')}</Button></form>
      </SettingsGroup>
    {/snippet}
  </WorkspaceLayout>
</ContentPageShell>
