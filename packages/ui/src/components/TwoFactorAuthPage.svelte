<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { ArrowLeft, ArrowRight, Check, Copy, Shield } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import * as Card from './ui/card/index.js';
  import * as Alert from './ui/alert/index.js';
  import ContentPageShell from './content/ContentPageShell.svelte';
  import ContentPageHeader from './content/ContentPageHeader.svelte';
  import OtpInput from './content/OtpInput.svelte';
  import TwoFactorStepper from './content/TwoFactorStepper.svelte';

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
  <TwoFactorStepper current={currentIndex} steps={[i18n.t('auth.twoFactorSetup'), i18n.t('auth.twoFactorScanQR'), i18n.t('auth.twoFactorVerify'), i18n.t('auth.twoFactorRecovery')]} />
  <Card.Card><Card.CardContent class="space-y-6 p-6">
    {#if currentStep === 'intro'}
      <div class="flex items-start gap-3"><span class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Shield class="size-5" /></span><div><h2 class="text-base font-semibold text-foreground">{i18n.t('auth.twoFactorSetup')}</h2><p class="mt-1 text-sm text-muted-foreground">{i18n.t('security.twoFactorDescription')}</p></div></div>
      <ol class="space-y-2 text-sm text-muted-foreground"><li class="rounded-md border border-border p-3">1. {i18n.t('auth.twoFactorScanQR')}</li><li class="rounded-md border border-border p-3">2. {i18n.t('auth.twoFactorEnterCode')}</li><li class="rounded-md border border-border p-3">3. {i18n.t('auth.twoFactorSaveRecovery')}</li></ol>
      <Button class="w-full" onclick={() => currentStep = 'scan'}>{i18n.t('common.next')}<ArrowRight class="size-4" /></Button>
    {:else if currentStep === 'scan'}
      <div class="space-y-4 text-center"><div class="mx-auto grid size-48 grid-cols-8 gap-0.5 rounded-md border border-border bg-muted p-5">{#each Array(64) as _, index (index)}<span class={'aspect-square ' + ((index * 11 + index % 7) % 3 === 0 ? 'bg-foreground' : 'bg-transparent')}></span>{/each}</div><p class="text-sm text-muted-foreground">{i18n.t('auth.twoFactorScanQR')}</p></div>
      <div class="flex justify-between gap-2"><Button variant="outline" onclick={() => currentStep = 'intro'}><ArrowLeft class="size-4" />{i18n.t('common.back')}</Button><Button onclick={() => currentStep = 'verify'}>{i18n.t('common.next')}<ArrowRight class="size-4" /></Button></div>
    {:else if currentStep === 'verify'}
      <div class="space-y-4"><div><h2 class="text-base font-semibold text-foreground">{i18n.t('auth.twoFactorVerify')}</h2><p class="mt-1 text-sm text-muted-foreground">{i18n.t('auth.twoFactorEnterCode')}</p></div>{#if error}<Alert.Root variant="destructive"><Alert.Description>{error}</Alert.Description></Alert.Root>{/if}<OtpInput bind:value={codeDigits} /><div class="flex justify-between gap-2"><Button variant="outline" onclick={() => currentStep = 'scan'}><ArrowLeft class="size-4" />{i18n.t('common.back')}</Button><Button onclick={verify}>{i18n.t('common.next')}<ArrowRight class="size-4" /></Button></div></div>
    {:else}
      <div class="space-y-4"><div><h2 class="text-base font-semibold text-foreground">{i18n.t('auth.twoFactorRecovery')}</h2><p class="mt-1 text-sm text-muted-foreground">{i18n.t('auth.twoFactorRecoveryHint')}</p></div><div class="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted p-4 font-mono text-sm">{#each recoveryCodes as code (code)}<span>{code}</span>{/each}</div><div class="flex justify-end gap-2"><Button variant="outline" onclick={copyCodes}>{#if copied}<Check class="size-4" />{:else}<Copy class="size-4" />{/if}{i18n.t('common.copy')}</Button><Button onclick={() => { enabled = true; currentStep = 'intro'; }}>{i18n.t('account.completeSetup')}</Button></div>{#if enabled}<p class="text-sm text-success">{i18n.t('security.twoFactorActive')}</p>{/if}</div>
    {/if}
  </Card.CardContent></Card.Card>
</ContentPageShell>
