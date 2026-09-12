<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
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
        <section class="svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-a6afccfc915b svadmin-u-989c466fdbe7 svadmin-u-8e63407b5ceb" role="status" aria-live="polite">
          <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-0c3bc98565dd svadmin-u-020ba687fa12 svadmin-u-9f76a62f4f44 svadmin-u-3b9871a0bf93"><div class="svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-60541e1e26f8 svadmin-u-1004c0c3954c"><ShieldCheck class="svadmin-u-15e1b1f444fe svadmin-u-add63bc6753d svadmin-u-012fbd121f37 svadmin-u-20aaf08a7ed1" /><div class="svadmin-u-7e0b7cdf1a94"><h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('api.successTitle')}</h2><p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('api.successHint')}</p></div></div><Button variant="ghost" size="sm" onclick={() => { generatedSecret = ''; copied = false; }}>{i18n.t('common.close')}</Button></div>
          <div class="svadmin-u-0ab8667228fd svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4"><Input readonly value={generatedSecret} class="svadmin-u-7e0b7cdf1a94 svadmin-u-0e65706bcccd svadmin-u-359090c2d529" aria-label={i18n.t('api.successTitle')} /><Button size="icon" onclick={copySecret} aria-label={i18n.t('common.copy')}>{#if copied}<Check class="svadmin-u-f7b5fa971871" />{:else}<Copy class="svadmin-u-f7b5fa971871" />{/if}</Button></div>
        </section>
      {/if}
    {/snippet}
    {#snippet primary()}
      <div class="svadmin-u-b3542e058833">
        <SettingsGroup title={i18n.t('api.activeKeysTitle')} description={i18n.t('api.activeKeysDesc')} bodyClass="p-0">
          {#if loading}
            <DataState state="loading" />
          {:else if error}
            <DataState state="error" description={error} retry={loadCredentials} />
          {:else}
            <ApiKeyList
              class="svadmin-u-0c5e9137c7de svadmin-u-119b2aa0b8f6"
              keys={keys.map((key) => definedOptions({
                id: key.id, name: key.name, prefix: key.prefix,
                createdAt: new Date(key.createdAt).toLocaleString(),
                lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : undefined,
                permissions: key.permissions,
              }))}
              stateTitle={i18n.t('api.noKeys')}
              stateDescription={credentialProvider ? i18n.t('api.generateDesc') : (isZh ? '配置 CredentialProvider 后可管理真实凭据。' : 'Configure CredentialProvider to manage real credentials.')}
              {...definedOptions({ onrevoke: credentialProvider ? (key: { id: string }) => revokeKey(key.id) : undefined })}
            />
          {/if}        </SettingsGroup>
        <SettingsGroup title={i18n.t('api.webhooks')} description={i18n.t('api.webhooksDesc')} bodyClass="space-y-5">
          <form class="svadmin-u-f3c543ad5fe9 svadmin-u-7e0b7cdf1a94 svadmin-u-0c3bc98565dd svadmin-u-e4d6f343b9ff" onsubmit={handleAddWebhook}><div class="svadmin-u-6f7e013d6499"><Label for="webhook-name">{i18n.t('api.webhookName')}</Label><Input id="webhook-name" bind:value={newWebhookName} placeholder="Order Events" disabled={!credentialProvider || submitting} /></div><div class="svadmin-u-6f7e013d6499 svadmin-u-eea04c60c0ca"><Label for="webhook-url">{i18n.t('api.webhookUrl')}</Label><Input id="webhook-url" type="url" bind:value={newWebhookUrl} placeholder="https://api.example.com/hooks" disabled={!credentialProvider || submitting} /></div><div class="svadmin-u-6f7e013d6499"><Label for="webhook-event">{i18n.t('api.eventType')}</Label><select id="webhook-event" bind:value={newWebhookEvent} disabled={!credentialProvider || submitting} class="svadmin-u-60fbb7713999 svadmin-u-e7a768f922d2 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-fc7473ca09eb svadmin-u-582e6ef4b245 svadmin-u-55d048ebfb1c svadmin-u-608dd26cd5ba svadmin-u-80b9d0ae125f svadmin-u-6b22a22a9752 svadmin-u-b29d8adbad2e"><option value="resource.created">resource.created</option><option value="resource.updated">resource.updated</option><option value="resource.deleted">resource.deleted</option><option value="auth.login">auth.login</option></select></div><div class="svadmin-u-60fbb7713999 svadmin-u-6f27f4f79e55"><Button type="submit" class="svadmin-u-6da6a3c3f741" disabled={!credentialProvider || submitting || !newWebhookName.trim() || !newWebhookUrl.trim()}><Plus class="svadmin-u-f7b5fa971871" />{i18n.t('api.addWebhook')}</Button></div></form>
          {#if webhooks.length === 0}<DataState state="empty" title={i18n.t('api.noWebhooks')} description={credentialProvider ? i18n.t('api.webhooksDesc') : (isZh ? '配置 CredentialProvider 后可管理真实 Webhook。' : 'Configure CredentialProvider to manage real webhooks.')} />{:else}<div class="svadmin-u-fa6acbf81d74 svadmin-u-e783642739e3 svadmin-u-b950dda299d3 svadmin-u-18049387f0af">{#each webhooks as hook (hook.id)}<div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-cb11fec3bb46 svadmin-u-020ba687fa12 svadmin-u-9f76a62f4f44 svadmin-u-3b9871a0bf93"><div class="svadmin-u-7e0b7cdf1a94"><p class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{hook.name}</p><p class="svadmin-u-f283ea9bea0e svadmin-u-0e65706bcccd svadmin-u-359090c2d529 svadmin-u-bfa603190748">{hook.url}</p></div><div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c svadmin-u-1f51d781e606"><span class="svadmin-u-07389a777c1f svadmin-u-2ef11f1cb219 svadmin-u-d5eab218aa34 svadmin-u-660d2effb880 svadmin-u-0e65706bcccd svadmin-u-359090c2d529 svadmin-u-bfa603190748">{hook.eventType}</span><Button variant="ghost" size="icon-sm" onclick={() => deleteWebhook(hook.id)} aria-label={i18n.t('common.delete') + ' ' + hook.name}><Trash2 class="svadmin-u-f7b5fa971871" /></Button></div></div>{/each}</div>{/if}
        </SettingsGroup>
      </div>
    {/snippet}
    {#snippet secondary()}
      <SettingsGroup title={i18n.t('api.generateTitle')} description={i18n.t('api.generateDesc')}>
        <form onsubmit={handleGenerateKey} class="svadmin-u-b43b4c086d9a"><div class="svadmin-u-6f7e013d6499"><Label for="api-key-name">{i18n.t('api.keyName')}</Label><Input id="api-key-name" placeholder="CI deployment token" bind:value={newKeyName} required disabled={!credentialProvider || submitting} /></div><fieldset class="svadmin-u-6ed543e2fbbb" disabled={!credentialProvider || submitting}><legend class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{i18n.t('api.permissions')}</legend>{#each Object.keys(newKeyPermissions) as permission (permission)}<div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4"><Checkbox id={`perm-${permission}`} bind:checked={newKeyPermissions[permission as keyof typeof newKeyPermissions]} /><Label for={`perm-${permission}`} class="svadmin-u-34516836730d svadmin-u-fc7473ca09eb svadmin-u-8ecebc9f80e6">{permission}</Label></div>{/each}</fieldset><Button type="submit" class="svadmin-u-6da6a3c3f741" disabled={!credentialProvider || submitting || !newKeyName.trim()}>{i18n.t('api.generateButton')}</Button></form>
      </SettingsGroup>
    {/snippet}
  </WorkspaceLayout>
</ContentPageShell>
