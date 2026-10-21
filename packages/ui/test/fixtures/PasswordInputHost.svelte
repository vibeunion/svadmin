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
    cleanFlat = false,
    nested = false,
    direction = 'ltr',
    multiple = false,
  }: {
    initialValue?: string;
    disabled?: boolean;
    showStrength?: boolean;
    showLabel?: boolean;
    ariaInvalid?: 'true' | 'false' | undefined;
    ariaDescribedby?: string | undefined;
    cleanFlat?: boolean;
    nested?: boolean;
    direction?: 'ltr' | 'rtl';
    multiple?: boolean;
  } = $props();

  const scope = createI18nScope({ locale: 'en' });
  provideI18nScope(scope);

  let value = $state(untrack(() => initialValue));
  let submits = $state(0);
  let confirmation = $state('');

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    submits += 1;
  }
</script>

{#snippet passwordField()}
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
{/snippet}

<div class:layout-clean-flat={cleanFlat} dir={direction}>
<section data-svadmin-auth-page>
<form onsubmit={handleSubmit}>
  {#if nested}<div>{@render passwordField()}</div>{:else}{@render passwordField()}{/if}
  {#if multiple}
    <PasswordInput id="confirmation" label="Confirm password" bind:value={confirmation} />
  {/if}
  {#if ariaDescribedby}
    <p id={ariaDescribedby}>Use at least 12 characters.</p>
  {/if}
  <button type="submit">Submit</button>
</form>
</section>
</div>

<output data-testid="password-value">{value}</output>
<output data-testid="submit-count">{submits}</output>
