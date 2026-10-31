<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props {
    /** Caller class merged with the built-in class list. */
    class?: string;
    name?: string;
    label?: string;
    length?: number;
    value?: string;
    disabled?: boolean;
    required?: boolean;
    autocomplete?: HTMLInputAttributes['autocomplete'];
  }

  let {
    name = 'code',
    label = 'Verification code',
    length = 6,
    value = '',
    disabled = false,
    required = true,
    autocomplete = 'one-time-code',
    class: className = '',
  }: Props = $props();
</script>

<label class="lite-form-group lite-otp-input {className}">
  <span>{label}</span>
  <input
    class="lite-input"
    type="text"
    {name}
    {value}
    {disabled}
    {required}
    {autocomplete}
    inputmode="numeric"
    pattern={`[0-9]{${length}}`}
    maxlength={length}
    placeholder={Array.from({ length }, () => '0').join('')}
    aria-describedby={`${name}-hint`}
  />
  <small id={`${name}-hint`}>{length}-digit code</small>
</label>

<style>
  .lite-otp-input input { max-width: 14rem; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 18px; letter-spacing: 0.35em; }
  .lite-otp-input small { color: #86909C; font-size: 12px; }
</style>
