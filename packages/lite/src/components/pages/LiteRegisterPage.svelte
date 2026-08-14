<script lang="ts">

  interface Props {
    title?: string;
    description?: string;
    action?: string;
    loginUrl?: string;
    errors?: string[];
  }

  let {
    title = 'Register',
    description = 'Create a new account',
    action = '?/register',
    loginUrl = '/lite/login',
    errors = [],
  }: Props = $props();
</script>

<div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; padding: 20px;">
  <div class="lite-card" style="width: 100%; max-width: 400px; padding: 32px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 8px;">{title}</h1>
      <p style="font-size: 14px; color: #64748b; margin: 0;">{description}</p>
    </div>

    <form method="POST" {action} class="lite-stack-lg">
      <div class="lite-form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" class="lite-input" required />
      </div>

      <div class="lite-form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" class="lite-input" required minlength="6" />
      </div>

      <div class="lite-form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input type="password" id="confirmPassword" name="confirmPassword" class="lite-input" required minlength="6" />
      </div>

      {#if errors.length > 0}
        <div style="padding: 12px; background: #fef2f2; border-radius: 6px; color: #ef4444; font-size: 13px;">
          <ul style="margin: 0; padding-left: 20px;">
            {#each errors as err, _i (_i)}
              <li>{err}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <button type="submit" class="lite-btn lite-btn-primary" style="width: 100%; justify-content: center; padding: 10px;">
        Register
      </button>

      <div style="text-align: center; font-size: 13px; color: #64748b; margin-top: 8px;">
        Already have an account? <a href={loginUrl} style="color: #2563eb; text-decoration: none;">Login</a>
      </div>
    </form>
  </div>
</div>
