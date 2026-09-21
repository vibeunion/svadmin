<script lang="ts">
  import { captureAdminContext, type Organization } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import DataState from '../content/DataState.svelte';
  import FeedbackNotice from '../content/FeedbackNotice.svelte';
  import { Input } from '../ui/input/index.js';
  import { Button } from '../ui/button/index.js';

  const context = captureAdminContext();
  const i18n = useTranslation();
  const isZh = $derived(i18n.locale === 'zh-CN');
  const provider = $derived(context.organizationProvider);
  let organization = $state<Organization | null>(null);
  let name = $state('');
  let loading = $state(false);
  let saving = $state(false);
  let error = $state('');
  let loadError = $state('');
  let status = $state('');
  let epoch = 0;
  async function load() {
    const current = provider;
    const request = ++epoch;
    organization = null; name = ''; error = ''; loadError = ''; status = ''; saving = false;
    loading = Boolean(current);
    if (!current) return;
    try {
      const result = await current.getCurrentOrganization(context.enterpriseRequestContext);
      if (request !== epoch) return;
      organization = result; name = result?.name ?? '';
    } catch (caught) {
      if (request === epoch) loadError = caught instanceof Error ? caught.message : String(caught);
    } finally {
      if (request === epoch) loading = false;
    }
  }
  $effect(() => {
    void provider; void context.authProvider; void context.tenantCacheKey?.__svadminTenant;
    void load();
    return () => { epoch += 1; };
  });
  async function save(event: SubmitEvent) {
    event.preventDefault();
    const current = provider;
    if (!current?.updateCurrentOrganization || !organization || !name.trim() || saving) return;
    const request = epoch;
    saving = true; error = ''; status = '';
    try {
      const result = await current.updateCurrentOrganization({ name: name.trim() }, context.enterpriseRequestContext);
      if (request !== epoch) return;
      organization = result; name = result.name;
      status = isZh ? '组织信息已保存' : 'Organization saved';
    } catch (caught) {
      if (request === epoch) error = caught instanceof Error ? caught.message : String(caught);
    } finally {
      if (request === epoch) saving = false;
    }
  }
</script>

<ContentPageShell pageId="account-company-profile" width="narrow">
  <ContentPageHeader title={i18n.t('account.companyProfile')} />
  {#if !provider}
    <FeedbackNotice tone="warning" message={isZh ? '未配置组织资料服务，无法加载或保存公司资料。' : 'OrganizationProvider is not configured. Company details cannot be loaded or saved.'} />
  {:else if loading}
    <DataState state="loading" />
  {:else if loadError}
    <DataState state="error" description={loadError} retry={load} />
  {:else if !organization}
    <DataState state="empty" title={isZh ? '暂无组织资料' : 'No organization details'} />
  {:else}
    <form onsubmit={save}>
      <label for="company-name">{isZh ? '组织名称' : 'Organization name'}</label>
      <Input id="company-name" bind:value={name} required disabled={saving || !provider.updateCurrentOrganization} />
      {#if !provider.updateCurrentOrganization}<p>{isZh ? '当前组织资料为只读。' : 'Organization details are read-only.'}</p>{/if}
      <Button type="submit" disabled={saving || !provider.updateCurrentOrganization || !name.trim() || name.trim() === organization.name}>{saving ? i18n.t('common.loading') : i18n.t('common.save')}</Button>
      {#if error}<p role="alert">{error}</p>{/if}
      {#if status}<p role="status">{status}</p>{/if}
    </form>
  {/if}
</ContentPageShell>
