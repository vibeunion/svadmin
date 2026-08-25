<script lang="ts">
  import { captureAdminContext, useLogin } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Label } from './ui/label/index.js';
  import * as Alert from './ui/alert/index.js';
  import AuthPageShell from './AuthPageShell.svelte';
  import PasswordInput from './PasswordInput.svelte';
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

{#snippet footer()}
  {#if authProvider?.register}
    <div class="flex items-center justify-center gap-1.5"><span class="text-sm text-muted-foreground">{i18n.t('auth.noAccount')}</span><Button variant="link" class="h-auto p-0 text-sm font-semibold" onclick={() => adminContext.navigate('/register')}>{i18n.t('auth.register')}</Button></div>
  {/if}
{/snippet}

<AuthPageShell brand={title} title={i18n.t('auth.welcomeBack')} description={i18n.t('auth.welcomeMessage')} {footer}>
      {#if loginHint || defaultIdentifier || defaultPassword}
        <aside class="mb-5 rounded-md border border-border bg-muted/35 p-3">
          {#if loginHint}
            <p class="text-sm font-medium text-foreground">{loginHint}</p>
          {/if}
          <dl class="mt-3 grid gap-2 sm:grid-cols-2">
            {#if defaultIdentifier}
              <div class="rounded-md border border-border bg-background px-3 py-2">
                <dt class="text-xs font-medium text-muted-foreground">{i18n.t('auth.usernameOrEmail')}</dt>
                <dd class="mt-1 truncate font-mono text-sm text-foreground">{defaultIdentifier}</dd>
              </div>
            {/if}
            {#if defaultPassword}
              <div class="rounded-md border border-border bg-background px-3 py-2">
                <dt class="text-xs font-medium text-muted-foreground">{i18n.t('auth.password')}</dt>
                <dd class="mt-1 font-mono text-sm text-foreground">{defaultPassword}</dd>
              </div>
            {/if}
          </dl>
        </aside>
      {/if}

      <form onsubmit={handleSubmit} class="space-y-5">
        {#if error}
          <Alert.Root variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <Alert.Description class="text-sm font-medium">{error}</Alert.Description>
          </Alert.Root>
        {/if}

        <div class="space-y-2">
          <Label for="login-identifier">
            {i18n.t('auth.usernameOrEmail')}
          </Label>
          <div class="relative">
            <User class="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-identifier"
              type="text"
              placeholder={i18n.t('auth.identifierPlaceholder')}
              bind:value={identifier}
              class="pl-9"
              autocomplete="username"
            />
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="login-password">
              {i18n.t('auth.password')}
            </Label>
            {#if authProvider?.forgotPassword}
              <Button variant="link" class="h-auto p-0 text-xs font-medium" onclick={() => adminContext.navigate('/forgot-password')}>
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

        <Button type="submit" class="h-10 w-full" disabled={login.isLoading}>
          {#if login.isLoading}
            <Loader2 class="h-5 w-5 animate-spin mr-2" />
          {/if}
          {i18n.t('auth.loginButton')}
        </Button>
      </form>

      {#if socialProviders.length > 0}
        <div class="relative my-6">
          <Separator />
          <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 text-xs font-medium text-muted-foreground">
            {i18n.t('auth.orContinueWith')}
          </span>
        </div>

        <div class="grid gap-3" class:grid-cols-2={socialProviders.length >= 2}>
          {#each socialProviders as provider (provider.name)}
            <Button
              variant="outline"
              class="h-10 w-full"
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
</AuthPageShell>
