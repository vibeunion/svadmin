<script lang="ts">
  import { captureAdminContext, useForgotPassword } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Label } from './ui/label/index.js';
  import * as Alert from './ui/alert/index.js';
  import SvadminLogo from './SvadminLogo.svelte';
  import { User, ArrowLeft, CheckCircle, Loader2, AlertCircle } from '@lucide/svelte';

  const i18n = useTranslation();

  let { title = 'Admin' } = $props<{
    title?: string;
  }>();

  const adminContext = captureAdminContext();
  const forgot = useForgotPassword();

  let identifier = $state('');
  let error = $state('');
  let sent = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';

    if (!identifier) { error = i18n.t('auth.usernameOrEmailRequired'); return; }

    const result = await forgot.mutate({ email: identifier, username: identifier });
    if (result.success) {
      sent = true;
    } else {
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
          {i18n.t('auth.forgotPassword')}
        </h2>
        <p class="text-base text-white/70 leading-relaxed max-w-[320px]">
          {i18n.t('auth.forgotPasswordDescription')}
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
        <h1 class="text-2xl font-semibold tracking-tight">
          {#if sent}
            {i18n.t('auth.resetLinkSent')}
          {:else}
            {i18n.t('auth.forgotPassword')}
          {/if}
        </h1>
        <p class="text-sm text-muted-foreground">
          {#if sent}
            {i18n.t('auth.resetLinkSent')}
          {:else}
            {i18n.t('auth.forgotPasswordDescription')}
          {/if}
        </p>
      </div>

      {#if sent}
        <div class="space-y-4">
          <div class="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
            <CheckCircle class="h-5 w-5 text-primary shrink-0" />
            <p class="text-sm text-muted-foreground">{i18n.t('auth.resetLinkSent')}</p>
          </div>
          <Button variant="outline" class="w-full" onclick={() => adminContext.navigate('/login')}>
            <ArrowLeft class="h-4 w-4 mr-2" />
            {i18n.t('auth.backToLogin')}
          </Button>
        </div>
      {:else}
        <form onsubmit={handleSubmit} class="space-y-5">
          {#if error}
            <Alert.Root variant="destructive">
              <AlertCircle class="h-4 w-4" />
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          {/if}

          <div class="space-y-2">
            <Label for="forgot-identifier">{i18n.t('auth.usernameOrEmail')}</Label>
            <div class="relative">
              <User class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-[1]" />
              <Input
                id="forgot-identifier"
                type="text"
                placeholder={i18n.t('auth.identifierPlaceholder')}
                bind:value={identifier}
                class="pl-9"
                autocomplete="username"
              />
            </div>
          </div>

          <Button type="submit" class="w-full h-10" disabled={forgot.isLoading}>
            {#if forgot.isLoading}
              <Loader2 class="h-4 w-4 animate-spin mr-2" />
            {/if}
            {i18n.t('auth.sendResetLink')}
          </Button>
        </form>

        <div class="flex items-center justify-center mt-8 pt-6 border-t">
          <Button variant="link" class="text-sm h-auto p-0 font-medium inline-flex items-center gap-1" onclick={() => adminContext.navigate('/login')}>
            <ArrowLeft class="h-3 w-3" />
            {i18n.t('auth.backToLogin')}
          </Button>
        </div>
      {/if}

      <p class="text-xs text-muted-foreground/60 mt-8 text-center">
        Powered by {title}
      </p>
    </div>
  </div>
</div>
