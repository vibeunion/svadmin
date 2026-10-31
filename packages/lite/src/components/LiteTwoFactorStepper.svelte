<script lang="ts">
  import type { HTMLFormAttributes } from 'svelte/elements';
  import LiteSteps from './LiteSteps.svelte';
  import LiteOtpInput from './LiteOtpInput.svelte';

  interface Props {
    current?: number;
    /** Step labels; mirrors the reference `steps` prop. */
    steps?: string[];
    action: string;
    method?: HTMLFormAttributes['method'];
    codeName?: string;
    submitLabel?: string;
    title?: string;
    /** Applied to the step list, matching the reference component. */
    class?: string;
  }

  let {
    current = 1,
    steps = ['Password verified', 'Enter verification code', 'Access granted'],
    action,
    method = 'POST',
    codeName = 'code',
    submitLabel = 'Verify',
    title = 'Two-factor authentication',
    class: className = '',
  }: Props = $props();
</script>

<section class="lite-card lite-two-factor" aria-label={title}>
  <h2>{title}</h2>
  <LiteSteps
    current={current}
    label="Progress"
    class={className}
    items={steps.map((step) => ({ title: step }))}
  />
  <form {method} {action} class="lite-two-factor__form">
    <LiteOtpInput name={codeName} />
    <button class="lite-btn lite-btn-primary" type="submit">{submitLabel}</button>
  </form>
  <p class="lite-muted">Recovery codes can be used once if the authenticator is unavailable.</p>
</section>

<style>
  .lite-two-factor { display: block; }
  .lite-two-factor h2 { margin: 0; color: #1D2129; font-size: 18px; }
  .lite-two-factor__form { display: block; justify-items: start; }

  .lite-two-factor > * + * { margin-top: 16px; }
  .lite-two-factor__form > * + * { margin-top: 12px; }
</style>
