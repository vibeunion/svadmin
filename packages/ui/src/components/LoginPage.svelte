<script lang="ts">
  import { captureAdminContext, useLogin } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Label } from './ui/label/index.js';
  import * as Alert from './ui/alert/index.js';
  import PasswordInput from './PasswordInput.svelte';
  import SvadminLogo from './SvadminLogo.svelte';
  import { Separator } from './ui/separator/index.js';
  import { User, Loader2, AlertCircle } from '@lucide/svelte';

  const i18n = useTranslation();

  interface SocialProvider {
    name: string;
    icon?: string;
    onClick: () => void | Promise<void>;
  }

  let {
    title = 'Admin',
    onSuccess,
    socialProviders = [],
    defaultIdentifier = '',
    defaultPassword = '',
    loginHint,
  } = $props<{
    title?: string;
    onSuccess?: () => void;
    socialProviders?: SocialProvider[];
    defaultIdentifier?: string;
    defaultPassword?: string;
    loginHint?: string;
  }>();

  const adminContext = captureAdminContext();
  const login = useLogin({ successNotification: false, errorMessage: false });
  const authProvider = $derived(adminContext.authProvider);

  function getInitialIdentifier() {
    return defaultIdentifier;
  }

  function getInitialPassword() {
    return defaultPassword;
  }

  let identifier = $state(getInitialIdentifier());
  let password = $state(getInitialPassword());
  let error = $state('');

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';

    if (!identifier) { error = i18n.t('auth.usernameOrEmailRequired'); return; }
    if (!password) { error = i18n.t('auth.passwordRequired'); return; }

    const result = await login.mutate({ email: identifier, username: identifier, password });
    if (result.success) {
      onSuccess?.();
    } else {
      error = result.error?.message ?? i18n.t('common.loginFailed');
    }
  }
</script>

<div class="min-h-screen flex flex-col lg:flex-row">
  <div class="hidden lg:flex lg:w-[500px] xl:w-[560px] relative overflow-hidden bg-gradient-to-br from-primary/95 via-primary to-primary/85 shrink-0">
    <div class="absolute inset-0">
      <div class="absolute top-[12%] left-[8%] h-32 w-32 rounded-3xl border border-white/10 bg-white/5 rotate-12 backdrop-blur-sm"></div>
      <div class="absolute top-[54%] left-[54%] h-44 w-44 rounded-full border border-white/10 bg-white/5 -rotate-6 backdrop-blur-sm"></div>
      <div class="absolute bottom-[14%] left-[13%] h-28 w-28 rounded-2xl border border-white/10 bg-white/5 -rotate-12 backdrop-blur-sm"></div>
      <div class="absolute top-[30%] right-[10%] h-20 w-20 rounded-xl border border-white/10 bg-white/5 rotate-45 backdrop-blur-sm"></div>
      <div class="absolute inset-0 opacity-[0.04]" style="background-image: radial-gradient(circle, white 1px, transparent 1px); background-size: 24px 24px;"></div>
    </div>

    <div class="relative z-10 flex flex-col justify-between p-10 xl:p-12 w-full">
      <div class="flex items-center gap-3">
        <SvadminLogo size={44} onDark />
        <span class="text-xl font-semibold text-white tracking-tight">{title}</span>
      </div>

      <div class="max-w-[360px] space-y-4">
        <h2 class="text-4xl font-bold text-white leading-tight">
          {i18n.t('auth.welcomeBack')}
        </h2>
        <p class="text-lg text-white/75 leading-relaxed">
          {i18n.t('auth.welcomeMessage')}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="h-1.5 w-10 rounded-full bg-white/40"></div>
        <div class="h-1.5 w-5 rounded-full bg-white/20"></div>
        <div class="h-1.5 w-2 rounded-full bg-white/15"></div>
      </div>
    </div>
  </div>

  <div class="flex-1 flex items-center justify-center bg-background p-6 sm:p-10 lg:p-14">
    <div class="w-full max-w-[460px] space-y-8">
      <div class="mb-8 flex items-center gap-3 lg:hidden">
        <SvadminLogo size={44} />
        <span class="text-xl font-semibold tracking-tight text-foreground">{title}</span>
      </div>

      <div class="space-y-2.5">
        <h1 class="text-3xl font-semibold tracking-tight text-foreground">
          {i18n.t('auth.welcomeBack')}
        </h1>
        <p class="text-base text-muted-foreground leading-relaxed">
          {i18n.t('auth.welcomeMessage')}
        </p>
      </div>

      {#if loginHint || defaultIdentifier || defaultPassword}
        <div class="rounded-2xl border border-primary/15 bg-primary/[0.06] p-4 shadow-sm">
          {#if loginHint}
            <p class="text-sm font-medium text-primary">{loginHint}</p>
          {/if}
          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            {#if defaultIdentifier}
              <div class="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {i18n.t('auth.usernameOrEmail')}
                </p>
                <p class="mt-1 font-mono text-sm font-semibold text-foreground">{defaultIdentifier}</p>
              </div>
            {/if}
            {#if defaultPassword}
              <div class="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {i18n.t('auth.password')}
                </p>
                <p class="mt-1 font-mono text-sm font-semibold text-foreground">{defaultPassword}</p>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="space-y-6 login-form">
        {#if error}
          <Alert.Root variant="destructive" class="rounded-xl border border-destructive/20 bg-destructive/5">
            <AlertCircle class="h-4 w-4" />
            <Alert.Description class="text-sm font-medium">{error}</Alert.Description>
          </Alert.Root>
        {/if}

        <div class="space-y-2.5">
          <Label for="login-identifier" class="text-sm font-semibold text-foreground/80 pl-0.5">
            {i18n.t('auth.usernameOrEmail')}
          </Label>
          <div class="relative">
            <User class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-[1]" />
            <Input
              id="login-identifier"
              type="text"
              placeholder={i18n.t('auth.identifierPlaceholder')}
              bind:value={identifier}
              class="pl-12"
              autocomplete="username"
            />
          </div>
        </div>

        <div class="space-y-2.5">
          <div class="flex items-center justify-between pl-0.5">
            <Label for="login-password" class="text-sm font-semibold text-foreground/80">
              {i18n.t('auth.password')}
            </Label>
            {#if authProvider?.forgotPassword}
              <Button variant="link" class="text-xs h-auto p-0 font-medium hover:text-primary transition-colors" onclick={() => adminContext.navigate('/forgot-password')}>
                {i18n.t('auth.forgotPasswordLink')}
              </Button>
            {/if}
          </div>
          <PasswordInput
            id="login-password"
            label=""
            bind:value={password}
            autocomplete="current-password"
          />
        </div>

        <Button type="submit" class="w-full h-14 rounded-xl text-base font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 mt-2" disabled={login.isLoading}>
          {#if login.isLoading}
            <Loader2 class="h-5 w-5 animate-spin mr-2" />
          {/if}
          {i18n.t('auth.loginButton')}
        </Button>
      </form>

      {#if socialProviders.length > 0}
        <div class="relative my-8">
          <Separator />
          <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            {i18n.t('auth.orContinueWith')}
          </span>
        </div>

        <div class="grid gap-3" class:grid-cols-2={socialProviders.length >= 2}>
          {#each socialProviders as provider (provider.name)}
            <Button
              variant="outline"
              class="w-full h-12 rounded-xl font-semibold border-input/60 hover:bg-muted/50 hover:text-accent-foreground transition-all duration-200"
              onclick={provider.onClick}
            >
              {#if provider.icon}
                <span class="mr-2 text-lg">{provider.icon}</span>
              {/if}
              {provider.name}
            </Button>
          {/each}
        </div>
      {/if}

      {#if authProvider?.register}
        <div class="flex items-center justify-center gap-1.5 mt-8 pt-6 border-t border-border/60">
          <span class="text-sm text-muted-foreground">{i18n.t('auth.noAccount')}</span>
          <Button variant="link" class="text-sm h-auto p-0 font-semibold text-primary hover:underline" onclick={() => adminContext.navigate('/register')}>
            {i18n.t('auth.register')}
          </Button>
        </div>
      {/if}

      <p class="text-xs text-muted-foreground/50 mt-8 text-center tracking-wide font-medium">
        Powered by {title}
      </p>
    </div>
  </div>
</div>

<style>
  .login-form :global(input[data-slot='input']) {
    height: 3.5rem;
    border-radius: 0.75rem;
    border-color: color-mix(in oklch, var(--border) 88%, var(--foreground));
    background-color: var(--background);
    font-size: 0.975rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  }

  .login-form :global(input[data-slot='input']:focus-visible) {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary) 18%, transparent);
  }

  .login-form :global(.relative > svg:first-of-type) {
    left: 1rem;
    height: 1.25rem;
    width: 1.25rem;
    color: color-mix(in oklch, var(--muted-foreground) 82%, var(--foreground));
  }

  .login-form :global(.relative > button) {
    right: 0.625rem;
    height: 2.25rem;
    width: 2.25rem;
    border-radius: 0.5rem;
  }
</style>
