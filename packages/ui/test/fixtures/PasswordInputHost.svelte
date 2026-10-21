<script lang="ts">
  import { untrack } from 'svelte';
  import { createI18nScope, provideI18nScope } from '@svadmin/core/i18n';
  import PasswordInput from '../../src/components/PasswordInput.svelte';

  let {
    initialValue = '',
    disabled = false,
    showStrength = false,
    showLabel = true,
    ariaInvalid,
    ariaDescribedby,
  }: {
    initialValue?: string;
    disabled?: boolean;
    showStrength?: boolean;
    showLabel?: boolean;
    ariaInvalid?: 'true' | 'false' | undefined;
    ariaDescribedby?: string | undefined;
  } = $props();
  provideI18nScope(createI18nScope({ locale: 'en' }));
  let value = $state(untrack(() => initialValue));
  let submits = $state(0);
</script>

<form onsubmit={(event) => { event.preventDefault(); submits += 1; }}>
  {#if !showLabel}<label for="password">Password</label>{/if}
  <PasswordInput
    id="password"
    label="Password"
    bind:value
    {disabled}
    {showLabel}
    {showStrength}
    {ariaInvalid}
    {ariaDescribedby}
  />
  {#if ariaDescribedby}<p id={ariaDescribedby}>Check this password.</p>{/if}
  <button type="submit">Submit</button>
</form>
<output data-testid="submit-count">{submits}</output>
<output data-testid="password-value">{value}</output>
