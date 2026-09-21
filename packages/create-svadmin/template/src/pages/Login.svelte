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

<div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
  <div class="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-xl shadow-blue-900/5">
    <!-- Logo -->
    <div class="text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50">
        <Shield class="h-7 w-7 text-primary" />
      </div>
      <h1 class="mt-4 text-xl font-bold text-gray-900">Admin Panel</h1>
      <p class="mt-1 text-sm text-gray-500">Sign in to continue</p>
    </div>

    <!-- Error -->
    {#if error}
      <div role="alert" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    {/if}

    <!-- Form -->
    <form onsubmit={handleLogin} class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="admin@example.com"
        />
      </div>
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition"
      >
        {#if loading}
          <Loader2 class="h-4 w-4 animate-spin" />
        {/if}
        Sign in
      </button>
    </form>
  </div>
</div>
