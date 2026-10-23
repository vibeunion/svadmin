<script lang="ts">
  import type { AuthProvider } from '@svadmin/core';
  import { Building2 } from '@lucide/svelte';
  import AuthPageShell from '../../src/components/AuthPageShell.svelte';
  import AuthHost from '../../src/components/auth-contract.test-host.svelte';
  import { Input } from '../../src/components/ui/input/index.js';
  import { Button } from '../../src/components/ui/button/index.js';

  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') ?? 'default';
  const brand = params.has('long') ? 'QualificationWorkspaceInternationalOperations' : 'Qualification';
  const description = 'Use your work account to continue to QualificationWorkspaceInternationalOperations.';
  let attempts = $state(0);
  const provider: AuthProvider = {
    check: async () => ({ authenticated: false }),
    login: async () => {
      attempts += 1;
      return attempts === 1
        ? { success: false, error: { name: 'FixtureError', message: 'Check your work account and try again.' } }
        : { success: true };
    },
    logout: async () => ({ success: true }),
    ...(mode === 'login-recovery' ? { forgotPassword: async () => ({ success: true }) } : {}),
  };
</script>

<div class="svadmin-theme layout-clean-flat" data-theme="stripe">
  {#if mode.startsWith('login')}
    <AuthHost {provider} screen="login" loginProps={{ title: brand, identifierLabel: 'Work account', passwordLabel: 'Password', loginButtonLabel: 'Sign in' }} />
    <output hidden data-testid="login-attempts">{attempts}</output>
  {:else}
    {#snippet mark()}
      <Building2 width={40} height={40} aria-hidden="true" data-testid="custom-mark" />
    {/snippet}
    <AuthPageShell
      {brand}
      title="Sign in"
      {description}
      {...(mode === 'custom' ? { brandMark: mark } : {})}
    >
      <form aria-label="Work account" onsubmit={(event) => event.preventDefault()}>
        <div><label for="email">Email</label><Input id="email" autocomplete="username" /></div>
        <div><label for="password">Password</label><Input id="password" type="password" autocomplete="current-password" /></div>
        <Button type="submit">Continue</Button>
      </form>
      {#snippet footer()}<a href="#help">Account support</a>{/snippet}
    </AuthPageShell>
  {/if}
</div>
