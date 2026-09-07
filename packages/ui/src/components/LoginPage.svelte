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
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-58284b4ea568"><span class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('auth.noAccount')}</span><Button variant="link" class="svadmin-u-b8f0a08ece1e svadmin-u-8a539c7fe216 svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91" onclick={() => adminContext.navigate('/register')}>{i18n.t('auth.register')}</Button></div>
  {/if}
{/snippet}

<AuthPageShell brand={title} title={i18n.t('auth.welcomeBack')} description={i18n.t('auth.welcomeMessage')} {footer}>
      {#if loginHint || defaultIdentifier || defaultPassword}
        <aside class="svadmin-u-fb88ccaacf5b svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-60ed9c3ef326 svadmin-u-eb6e8b881acd">
          {#if loginHint}
            <p class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{loginHint}</p>
          {/if}
          <dl class="svadmin-u-eccd13ef4f2f svadmin-u-f3c543ad5fe9 svadmin-u-77a2a20e90d4 svadmin-u-e00ad81645a2">
            {#if defaultIdentifier}
              <div class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-e6f9e383a762 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b">
                <dt class="svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-bfa603190748">{i18n.t('auth.usernameOrEmail')}</dt>
                <dd class="svadmin-u-b6b02c0ebef6 svadmin-u-f283ea9bea0e svadmin-u-0e65706bcccd svadmin-u-fc7473ca09eb svadmin-u-d4108abe6359">{defaultIdentifier}</dd>
              </div>
            {/if}
            {#if defaultPassword}
              <div class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-e6f9e383a762 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b">
                <dt class="svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-bfa603190748">{i18n.t('auth.password')}</dt>
                <dd class="svadmin-u-b6b02c0ebef6 svadmin-u-0e65706bcccd svadmin-u-fc7473ca09eb svadmin-u-d4108abe6359">{defaultPassword}</dd>
              </div>
            {/if}
          </dl>
        </aside>
      {/if}

      <form onsubmit={handleSubmit} class="svadmin-u-b43b4c086d9a">
        {#if error}
          <Alert.Root variant="destructive">
            <AlertCircle class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
            <Alert.Description class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069">{error}</Alert.Description>
          </Alert.Root>
        {/if}

        <div class="svadmin-u-6f7e013d6499">
          <Label for="login-identifier">
            {i18n.t('auth.usernameOrEmail')}
          </Label>
          <div class="svadmin-u-d89972fe17d6">
            <User class="svadmin-u-a4326536b8f5 svadmin-u-da4dbfbc4fdc svadmin-u-22e59b722111 svadmin-u-d694ba66e322 svadmin-u-536a7530a44f svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-36b381be4df3 svadmin-u-bfa603190748" />
            <Input
              id="login-identifier"
              type="text"
              placeholder={i18n.t('auth.identifierPlaceholder')}
              bind:value={identifier}
              class="svadmin-u-9e83b2412bc9"
              autocomplete="username"
            />
          </div>
        </div>

        <div class="svadmin-u-6f7e013d6499">
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc">
            <Label for="login-password">
              {i18n.t('auth.password')}
            </Label>
            {#if authProvider?.forgotPassword}
              <Button variant="link" class="svadmin-u-b8f0a08ece1e svadmin-u-8a539c7fe216 svadmin-u-359090c2d529 svadmin-u-2689f3958069" onclick={() => adminContext.navigate('/forgot-password')}>
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

        <Button type="submit" class="svadmin-u-426b8b75185b svadmin-u-6da6a3c3f741" disabled={login.isLoading}>
          {#if login.isLoading}
            <Loader2 class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-afbdd13a380e svadmin-u-d2347e8497a9" />
          {/if}
          {i18n.t('auth.loginButton')}
        </Button>
      </form>

      {#if socialProviders.length > 0}
        <div class="svadmin-u-d89972fe17d6 svadmin-u-1256b2f6ad2d">
          <Separator />
          <span class="svadmin-u-da4dbfbc4fdc svadmin-u-e632769ad71e svadmin-u-d694ba66e322 svadmin-u-efaa0701487e svadmin-u-36b381be4df3 svadmin-u-cd0ad9a56558 svadmin-u-f0faeb26d656 svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-bfa603190748">
            {i18n.t('auth.orContinueWith')}
          </span>
        </div>

        <div class="svadmin-u-f3c543ad5fe9 svadmin-u-1004c0c3954c" class:grid-cols-2={socialProviders.length >= 2}>
          {#each socialProviders as provider (provider.name)}
            <Button
              variant="outline"
              class="svadmin-u-426b8b75185b svadmin-u-6da6a3c3f741"
              onclick={provider.onClick}
            >
              {#if provider.icon}
                <span class="svadmin-u-d2347e8497a9 svadmin-u-42536e69e639">{provider.icon}</span>
              {/if}
              {provider.name}
            </Button>
          {/each}
        </div>
      {/if}
</AuthPageShell>
