<script lang="ts">
  import { captureAdminContext, useUpdatePassword } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import { Button } from './ui/button/index.js';
  import * as Alert from './ui/alert/index.js';
  import PasswordInput from './PasswordInput.svelte';
  import SvadminLogo from './SvadminLogo.svelte';
  import { Loader2, AlertCircle } from '@lucide/svelte';

  const i18n = useTranslation();

  let { title = 'Admin' } = $props<{
    title?: string;
  }>();

  const adminContext = captureAdminContext();
  const updatePw = useUpdatePassword();

  let password = $state('');
  let confirmPassword = $state('');
  let error = $state('');

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';

    if (!password) { error = i18n.t('auth.passwordRequired'); return; }
    if (password !== confirmPassword) { error = i18n.t('auth.passwordMismatch'); return; }

    const result = await updatePw.mutate({ password, confirmPassword });
    if (!result.success) {
      error = result.error?.message ?? i18n.t('common.operationFailed');
    }
  }
</script>

<div class="min-h-screen flex flex-col lg:flex-row">
  <!-- Left brand panel -->
  <div class="hidden lg:flex lg:w-[480px] xl:w-[520px] relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/80 shrink-0">
    <div class="absolute inset-0">
      <div class="absolute top-[12%] left-[8%] w-28 h-28 rounded-3xl border border-white/10 bg-white/5 rotate-12 backdrop-blur-sm"></div>
      <div class="absolute top-[55%] left-[55%] w-40 h-40 rounded-full border border-white/10 bg-white/5 -rotate-6 backdrop-blur-sm"></div>
      <div class="absolute bottom-[15%] left-[15%] w-24 h-24 rounded-2xl border border-white/10 bg-white/5 -rotate-12 backdrop-blur-sm"></div>
      <div class="absolute top-[30%] right-[10%] w-16 h-16 rounded-xl border border-white/10 bg-white/5 rotate-45 backdrop-blur-sm"></div>
      <div class="absolute inset-0 opacity-[0.03]" style="background-image: radial-gradient(circle, white 1px, transparent 1px); background-size: 24px 24px;"></div>
    </div>

    <div class="relative z-10 flex flex-col justify-between p-10 xl:p-12 w-full">
      <div class="flex items-center gap-3">
        <SvadminLogo size={36} onDark />
        <span class="text-lg font-semibold text-white tracking-tight">{title}</span>
      </div>

      <div class="space-y-4">
        <h2 class="text-3xl xl:text-4xl font-bold text-white leading-tight">
          {i18n.t('auth.resetPassword')}
        </h2>
        <p class="text-base text-white/70 leading-relaxed max-w-[320px]">
          {i18n.t('auth.resetPasswordDescription')}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="h-1 w-8 rounded-full bg-white/30"></div>
        <div class="h-1 w-4 rounded-full bg-white/15"></div>
        <div class="h-1 w-2 rounded-full bg-white/10"></div>
      </div>
    </div>
  </div>

  <!-- Right form panel -->
  <div class="flex-1 flex items-center justify-center bg-background p-6 sm:p-8 lg:p-12">
    <div class="w-full max-w-[400px]">
      <div class="mb-8 flex items-center gap-3 lg:hidden">
        <SvadminLogo size={36} />
        <span class="text-lg font-semibold tracking-tight">{title}</span>
      </div>

      <div class="space-y-1 mb-8">
        <h1 class="text-2xl font-semibold tracking-tight">{i18n.t('auth.resetPassword')}</h1>
        <p class="text-sm text-muted-foreground">{i18n.t('auth.resetPasswordDescription')}</p>
      </div>

      <form onsubmit={handleSubmit} class="space-y-5">
        {#if error}
          <Alert.Root variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        {/if}

        <PasswordInput
          id="new-password"
          label={i18n.t('auth.password')}
          bind:value={password}
          autocomplete="new-password"
          showStrength
        />

        <PasswordInput
          id="confirm-password"
          label={i18n.t('auth.confirmPassword')}
          bind:value={confirmPassword}
          autocomplete="new-password"
        />

        <Button type="submit" class="w-full h-10" disabled={updatePw.isLoading}>
          {#if updatePw.isLoading}
            <Loader2 class="h-4 w-4 animate-spin mr-2" />
          {/if}
          {i18n.t('auth.resetPassword')}
        </Button>

        <div class="flex items-center justify-center mt-2">
          <Button variant="link" class="text-sm h-auto p-0 font-medium" onclick={() => adminContext.navigate('/login')}>
            {i18n.t('auth.backToLogin')}
          </Button>
        </div>
      </form>

      <p class="text-xs text-muted-foreground/60 mt-8 text-center">
        Powered by {title}
      </p>
    </div>
  </div>
</div>
