<script lang="ts">
  import { useLogin } from '@svadmin/core';
  import { Loader2, Shield } from '@lucide/svelte';

  const login = useLogin({ successNotification: false, errorMessage: false });

  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function handleLogin(e: Event) {
    e.preventDefault();
    if (loading) return;
    loading = true;
    error = null;

    try {
      const result = await login.mutate({ email, password });
      if (!result.success) {
        error = result.error?.message ?? 'Login failed';
      }
    } catch {
      error = 'Unable to sign in. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="scaffold-login">
  <div class="scaffold-login__panel">
    <!-- Logo -->
    <div class="scaffold-login__header">
      <div class="scaffold-login__mark" aria-hidden="true">
        <Shield size={28} strokeWidth={1.8} />
      </div>
      <h1>Admin Panel</h1>
      <p>Sign in to continue</p>
    </div>

    <!-- Error -->
    {#if error}
      <div role="alert" class="scaffold-login__error">
        {error}
      </div>
    {/if}

    <!-- Form -->
    <form onsubmit={handleLogin} class="scaffold-login__form">
      <label>
        <span>Email</span>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          class="scaffold-login__input"
          placeholder="admin@example.com"
        />
      </label>
      <label>
        <span>Password</span>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          class="scaffold-login__input"
          placeholder="Enter your password"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        class="scaffold-login__submit"
      >
        {#if loading}
          <span class="scaffold-login__spinner" aria-hidden="true"><Loader2 size={16} /></span>
        {/if}
        Sign in
      </button>
    </form>
  </div>
</div>

<style>
  .scaffold-login {
    display: grid;
    min-height: 100dvh;
    place-items: center;
    padding: 2rem 1rem;
    background: var(--background);
    background-image:
      linear-gradient(to right, color-mix(in oklch, var(--primary) 4%, transparent) 1px, transparent 1px),
      linear-gradient(to bottom, color-mix(in oklch, var(--primary) 4%, transparent) 1px, transparent 1px);
    background-size: var(--svadmin-grid-size) var(--svadmin-grid-size);
    color: var(--foreground);
  }

  .scaffold-login__panel {
    width: min(100%, 28rem);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--card);
    padding: 2rem;
    box-shadow: var(--shadow-surface);
  }

  .scaffold-login__header {
    display: grid;
    justify-items: center;
    gap: 0.5rem;
    text-align: center;
  }

  .scaffold-login__mark {
    display: grid;
    width: 3.5rem;
    height: 3.5rem;
    place-items: center;
    border: 1px solid color-mix(in oklch, var(--primary) 20%, var(--border));
    border-radius: var(--radius-md);
    background: color-mix(in oklch, var(--primary) 10%, var(--card));
    color: var(--primary);
  }

  .scaffold-login__header h1 {
    margin: 0.75rem 0 0;
    color: var(--foreground);
    font-size: 1.25rem;
    font-weight: 650;
    line-height: 1.3;
  }

  .scaffold-login__header p {
    margin: 0;
    color: var(--muted-foreground);
    font-size: 0.875rem;
  }

  .scaffold-login__error {
    margin-top: 1.5rem;
    border: 1px solid color-mix(in oklch, var(--destructive) 28%, var(--border));
    border-radius: var(--radius-md);
    background: color-mix(in oklch, var(--destructive) 8%, var(--card));
    color: var(--destructive);
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }

  .scaffold-login__form {
    display: grid;
    gap: 1rem;
    margin-top: 2rem;
  }

  .scaffold-login__form label {
    display: grid;
    gap: 0.5rem;
    color: var(--foreground);
    font-size: 0.875rem;
    font-weight: 600;
  }

  .scaffold-login__input {
    min-height: 2.75rem;
    width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--card);
    color: var(--foreground);
    padding: 0.625rem 0.75rem;
    font: inherit;
    font-size: 0.875rem;
    box-shadow: var(--shadow-control);
    transition: border-color var(--svadmin-motion-fast) ease-out, box-shadow var(--svadmin-motion-fast) ease-out;
  }

  .scaffold-login__input::placeholder {
    color: var(--muted-foreground);
    opacity: 0.75;
  }

  .scaffold-login__input:focus-visible {
    border-color: var(--ring);
    outline: 2px solid color-mix(in oklch, var(--ring) 42%, transparent);
    outline-offset: var(--svadmin-focus-offset);
  }

  .scaffold-login__submit {
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    border: 1px solid color-mix(in oklch, var(--primary) 70%, var(--border));
    border-radius: var(--radius-md);
    background: var(--primary);
    color: var(--primary-foreground);
    padding: 0.625rem 1rem;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 650;
    box-shadow: var(--shadow-control);
    transition: transform var(--svadmin-motion-standard) ease-out, box-shadow var(--svadmin-motion-standard) ease-out, background-color var(--svadmin-motion-standard) ease-out;
  }

  .scaffold-login__submit:hover:not(:disabled) {
    transform: translateY(-0.125rem);
  }

  .scaffold-login__submit:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
    box-shadow: var(--shadow-control);
  }

  .scaffold-login__submit:focus-visible {
    outline: 2px solid color-mix(in oklch, var(--ring) 78%, transparent);
    outline-offset: var(--svadmin-focus-offset);
  }

  .scaffold-login__submit:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .scaffold-login__spinner {
    animation: scaffold-login-spin var(--svadmin-motion-slow) linear infinite;
  }

  @keyframes scaffold-login-spin {
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .scaffold-login__input,
    .scaffold-login__submit {
      transition-duration: 0.01ms;
    }

    .scaffold-login__spinner {
      animation-duration: 0.01ms;
    }
  }

  @media (max-width: 32rem) {
    .scaffold-login {
      padding: 1rem;
    }

    .scaffold-login__panel {
      padding: 1.5rem;
    }
  }
</style>
