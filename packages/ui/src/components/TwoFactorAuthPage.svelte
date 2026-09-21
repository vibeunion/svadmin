<script lang="ts" module>
  export interface MfaEnrollmentProvider {
    begin: () => Promise<{ secret: string }>;
    verify: (code: string) => Promise<{ recoveryCodes: string[] }>;
  }
</script>

<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { captureAdminContext } from '@svadmin/core';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import ContentPageShell from './content/ContentPageShell.svelte';
  import ContentPageHeader from './content/ContentPageHeader.svelte';
  import FeedbackNotice from './content/FeedbackNotice.svelte';
  import { Copy, ShieldCheck } from '@lucide/svelte';

  let { enrollmentProvider }: { enrollmentProvider?: MfaEnrollmentProvider } = $props();
  const i18n = useTranslation();
  const context = captureAdminContext();
  const isZh = $derived(i18n.locale === 'zh-CN');
  let secret = $state('');
  let code = $state('');
  let recoveryCodes = $state<string[] | null>(null);
  let pending = $state(false);
  let error = $state('');
  let copied = $state(false);
  let epoch = 0;
  $effect(() => {
    void enrollmentProvider;
    void context.authProvider;
    void context.tenantCacheKey?.__svadminTenant;
    epoch += 1;
    secret = ''; code = ''; recoveryCodes = null; pending = false; error = ''; copied = false;
    return () => { epoch += 1; };
  });
  async function enroll(verify: boolean) {
    const provider = enrollmentProvider;
    if (!provider || pending) return;
    if (verify && !/^\d{6}$/.test(code)) {
      error = i18n.t('auth.twoFactorEnterCode');
      return;
    }
    const request = epoch;
    pending = true; error = '';
    try {
      if (verify) {
        const result = await provider.verify(code);
        if (request !== epoch) return;
        recoveryCodes = result.recoveryCodes;
        secret = ''; code = '';
      } else {
        const result = await provider.begin();
        if (request !== epoch) return;
        if (!result.secret) throw new Error(isZh ? '未返回登记密钥' : 'No enrollment secret returned');
        secret = result.secret;
      }
    } catch (caught) {
      if (request === epoch) error = caught instanceof Error ? caught.message : String(caught);
    } finally {
      if (request === epoch) pending = false;
    }
  }
  async function copyCodes() {
    if (!recoveryCodes) return;
    const request = epoch;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      if (request === epoch) copied = true;
    } catch {
      if (request === epoch) error = isZh ? '复制失败，请手动保存恢复码' : 'Copy failed. Save the recovery codes manually.';
    }
  }
</script>

<ContentPageShell pageId="auth-2fa" width="narrow">
  <ContentPageHeader title={i18n.t('auth.twoFactorSetup')} />
  {#if !enrollmentProvider}
    <FeedbackNotice tone="warning" message={isZh ? '未配置验证码登记与验证服务。此页面不会生成模拟密钥、恢复码或宣称已启用 MFA。' : 'Enrollment and verification are not configured. No simulated secrets, recovery codes, or MFA success will be generated.'} />
    <Button variant="outline" onclick={() => context.navigate('/settings/security')}>{i18n.t('settings.security')}</Button>
  {:else if recoveryCodes !== null}
    <p role="status"><ShieldCheck size={18} />{i18n.t('auth.twoFactorVerifySuccess')}</p>
    <p>{i18n.t('auth.twoFactorSaveRecovery')}</p>
    <pre>{recoveryCodes.join('\n')}</pre>
    <Button variant="outline" disabled={recoveryCodes.length === 0} onclick={copyCodes}><Copy size={16} />{copied ? (isZh ? '已复制' : 'Copied') : i18n.t('common.copy')}</Button>
  {:else if secret}
    <p>{isZh ? '将此登记密钥添加到身份验证器，然后输入验证码。' : 'Add this enrollment secret to your authenticator, then enter its verification code.'}</p>
    <code>{secret}</code>
    <form onsubmit={(event) => { event.preventDefault(); void enroll(true); }}>
      <label for="mfa-code">{i18n.t('auth.twoFactorEnterCode')}</label>
      <Input id="mfa-code" bind:value={code} inputmode="numeric" autocomplete="one-time-code" maxlength={6} disabled={pending} />
      <Button type="submit" disabled={pending}>{pending ? i18n.t('common.loading') : i18n.t('common.confirm')}</Button>
    </form>
  {:else}
    <Button disabled={pending} onclick={() => enroll(false)}>{pending ? i18n.t('common.loading') : i18n.t('auth.twoFactorSetup')}</Button>
  {/if}
  {#if error}<p role="alert">{error}</p>{/if}
</ContentPageShell>
