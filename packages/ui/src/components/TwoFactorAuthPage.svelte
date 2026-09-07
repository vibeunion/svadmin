<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, Shield } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import * as Card from './ui/card/index.js';
  import * as Alert from './ui/alert/index.js';
  import ContentPageShell from './content/ContentPageShell.svelte';
  import ContentPageHeader from './content/ContentPageHeader.svelte';
  import OtpInput from './content/OtpInput.svelte';
  import TwoFactorStepper from './content/TwoFactorStepper.svelte';
  import { Badge } from './ui/badge/index.js';
  import { Separator } from './ui/separator/index.js';

  type Step = 'intro' | 'scan' | 'verify' | 'recovery';
  const i18n = useTranslation();
  let currentStep = $state<Step>('intro');
  let enabled = $state(false);
  let codeDigits = $state<string[]>(Array.from({ length: 6 }, () => ''));
  let error = $state('');
  let copied = $state(false);
  const recoveryCodes = ['A1B2-C3D4', 'E5F6-G7H8', 'I9J0-K1L2', 'M3N4-O5P6', 'Q7R8-S9T0', 'U1V2-W3X4'];
  const currentIndex = $derived(currentStep === 'intro' ? 0 : currentStep === 'scan' ? 1 : currentStep === 'verify' ? 2 : 3);
  function verify() { if (codeDigits.join('').length !== 6) { error = i18n.t('auth.twoFactorEnterCode'); return; } error = ''; currentStep = 'recovery'; }
  function copyCodes() { navigator.clipboard?.writeText(recoveryCodes.join('\n')); copied = true; setTimeout(() => copied = false, 1500); }
</script>

<ContentPageShell pageId="auth-2fa" width="narrow">
  <ContentPageHeader title={i18n.t('auth.twoFactorSetup')} description={i18n.t('security.twoFactorDescription')} />
  {#if !enabled}<TwoFactorStepper current={currentIndex} steps={[i18n.t('auth.twoFactorSetup'), i18n.t('auth.twoFactorScanQR'), i18n.t('auth.twoFactorVerify'), i18n.t('auth.twoFactorRecovery')]} />{/if}
  <Card.Card><Card.CardContent class="svadmin-u-b3542e058833 svadmin-u-0478c89a150f">
    {#if currentStep === 'intro' && !enabled}
      <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-1004c0c3954c"><span class="svadmin-u-60fbb7713999 svadmin-u-7bbb00f9ba7a svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1"><Shield class="svadmin-u-add63bc6753d" /></span><div><h2 class="svadmin-u-4ee734926ff6 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('auth.twoFactorSetup')}</h2><p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('security.twoFactorDescription')}</p></div></div>
      <ol class="svadmin-u-6f7e013d6499 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748"><li class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-eb6e8b881acd">1. {i18n.t('auth.twoFactorScanQR')}</li><li class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-eb6e8b881acd">2. {i18n.t('auth.twoFactorEnterCode')}</li><li class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-eb6e8b881acd">3. {i18n.t('auth.twoFactorSaveRecovery')}</li></ol>
      <Button class="svadmin-u-6da6a3c3f741" onclick={() => currentStep = 'scan'}>{i18n.t('common.next')}<ArrowRight class="svadmin-u-f7b5fa971871" /></Button>
    {:else if currentStep === 'scan'}
      <div class="svadmin-u-3e7ce58d64fa svadmin-u-ca6bf63030aa"><div class="svadmin-u-0e12dc7de920 svadmin-u-f3c543ad5fe9 svadmin-u-b06f8413aa63 svadmin-u-e31889b585dc svadmin-u-a3899220f90e svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-2ef11f1cb219 svadmin-u-c07e54fd1439">{#each Array(64) as _, index (index)}<span class={'svadmin-u-b59cd297c349 ' + ((index * 11 + index % 7) % 3 === 0 ? 'svadmin-u-64643d78ed9b' : 'svadmin-u-7f19cdf4c5bb')}></span>{/each}</div><p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('auth.twoFactorScanQR')}</p></div>
      <div class="svadmin-u-60fbb7713999 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4"><Button variant="outline" onclick={() => currentStep = 'intro'}><ArrowLeft class="svadmin-u-f7b5fa971871" />{i18n.t('common.back')}</Button><Button onclick={() => currentStep = 'verify'}>{i18n.t('common.next')}<ArrowRight class="svadmin-u-f7b5fa971871" /></Button></div>
    {:else if currentStep === 'verify'}
      <div class="svadmin-u-3e7ce58d64fa"><div><h2 class="svadmin-u-4ee734926ff6 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('auth.twoFactorVerify')}</h2><p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('auth.twoFactorEnterCode')}</p></div>{#if error}<Alert.Root variant="destructive"><Alert.Description>{error}</Alert.Description></Alert.Root>{/if}<OtpInput bind:value={codeDigits} /><div class="svadmin-u-60fbb7713999 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4"><Button variant="outline" onclick={() => currentStep = 'scan'}><ArrowLeft class="svadmin-u-f7b5fa971871" />{i18n.t('common.back')}</Button><Button onclick={verify}>{i18n.t('common.next')}<ArrowRight class="svadmin-u-f7b5fa971871" /></Button></div></div>
    {:else if currentStep === 'recovery'}
      <div class="svadmin-u-3e7ce58d64fa"><div><h2 class="svadmin-u-4ee734926ff6 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('auth.twoFactorRecovery')}</h2><p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('auth.twoFactorRecoveryHint')}</p></div><div class="svadmin-u-f3c543ad5fe9 svadmin-u-8e75e3db482b svadmin-u-77a2a20e90d4 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-2ef11f1cb219 svadmin-u-8e63407b5ceb svadmin-u-0e65706bcccd svadmin-u-fc7473ca09eb">{#each recoveryCodes as code (code)}<span>{code}</span>{/each}</div><div class="svadmin-u-60fbb7713999 svadmin-u-77c08e015d14 svadmin-u-77a2a20e90d4"><Button variant="outline" onclick={copyCodes}>{#if copied}<Check class="svadmin-u-f7b5fa971871" />{:else}<Copy class="svadmin-u-f7b5fa971871" />{/if}{i18n.t('common.copy')}</Button><Button onclick={() => { enabled = true; currentStep = 'intro'; }}>{i18n.t('account.completeSetup')}</Button></div>{#if enabled}<p class="svadmin-u-fc7473ca09eb svadmin-u-76747e5e02ff">{i18n.t('security.twoFactorActive')}</p>{/if}</div>
    {:else}
      <div class="svadmin-u-b3542e058833 svadmin-u-0478c89a150f svadmin-u-ca6bf63030aa">
        <div class="svadmin-u-0e12dc7de920 svadmin-u-60fbb7713999 svadmin-u-9939b97359ce svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-a217b4eaa918 svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff">
          <Shield class="svadmin-u-9af3b4b6dc9e" />
        </div>
        <div>
          <h2 class="svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('auth.twoFactorVerifySuccess')}</h2>
          <p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('security.twoFactorActive')}</p>
        </div>
        <Badge variant="secondary" class="svadmin-u-0e12dc7de920 svadmin-u-92e7450ad20d svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff">
          <CheckCircle2 class="svadmin-u-783b0d9d1e2c" />{i18n.t('securityLog.twoFactorEnabled')}
        </Badge>
        <Separator />
        <Button variant="destructive" onclick={() => { enabled = false; currentStep = 'intro'; }}>
          {i18n.t('auth.twoFactorDisable')}
        </Button>
      </div>
    {/if}
  </Card.CardContent></Card.Card>
</ContentPageShell>
