<script lang="ts">
  import { cn } from '../utils.js';
  import {
    findDialCodeByCountry,
    PHONE_DIAL_CODES,
    toE164,
    type PhoneDialCode,
  } from './phone-dial-codes.js';

  interface Props {
    /** ISO 3166-1 alpha-2 country code. */
    country?: string;
    /** National number without the dialling prefix. */
    nationalNumber?: string;
    countries?: readonly PhoneDialCode[];
    id?: string;
    name?: string;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string;
    ariaLabel?: string;
    class?: string;
    onchange?: (payload: { country: string; nationalNumber: string; e164: string }) => void;
  }

  let {
    country = $bindable('CN'),
    nationalNumber = $bindable(''),
    countries = PHONE_DIAL_CODES,
    id,
    name,
    placeholder = 'Phone number',
    disabled = false,
    readonly = false,
    required = false,
    invalid = false,
    describedby,
    ariaLabel = 'Phone number',
    class: className = '',
    onchange,
  }: Props = $props();

  const entry = $derived(findDialCodeByCountry(country, countries));
  const dial = $derived(entry?.dial ?? '');

  function emit(): void {
    onchange?.({
      country,
      nationalNumber,
      e164: toE164(country, nationalNumber, countries),
    });
  }
</script>

<div
  class={cn('svadmin-phone-input', className)}
  data-slot="phone-input"
  data-invalid={invalid ? 'true' : undefined}
  data-disabled={disabled ? 'true' : undefined}
>
  <select
    class="svadmin-phone-input__country"
    bind:value={country}
    {disabled}
    aria-label={`${ariaLabel}: country code`}
    onchange={emit}
  >
    {#each countries as option (option.country)}
      <option value={option.country}>{option.name} (+{option.dial})</option>
    {/each}
  </select>

  <div class="svadmin-phone-input__control">
    {#if dial}<span class="svadmin-phone-input__dial" aria-hidden="true">+{dial}</span>{/if}
    <input
      class="svadmin-phone-input__field"
      type="tel"
      inputmode="tel"
      autocomplete="tel-national"
      {id}
      {name}
      bind:value={nationalNumber}
      {placeholder}
      {disabled}
      {readonly}
      {required}
      aria-label={ariaLabel}
      aria-invalid={invalid ? 'true' : undefined}
      aria-describedby={describedby}
      oninput={emit}
    />
  </div>
</div>

<style>
  .svadmin-phone-input {
    display: flex;
    align-items: stretch;
    border: 1px solid var(--border, currentColor);
    border-radius: min(var(--radius, 0.5rem), 0.5rem);
    background: var(--background, transparent);
    color: var(--foreground, currentColor);
  }

  .svadmin-phone-input:focus-within { outline: 2px solid var(--ring, currentColor); outline-offset: 1px; }
  .svadmin-phone-input[data-invalid='true'] { border-color: var(--destructive, currentColor); }
  .svadmin-phone-input[data-disabled='true'] { cursor: not-allowed; opacity: 0.6; }

  .svadmin-phone-input__country {
    flex: none;
    max-width: 11rem;
    border: 0;
    border-inline-end: 1px solid var(--border, currentColor);
    border-start-start-radius: inherit;
    border-end-start-radius: inherit;
    padding: 0.5rem 0.625rem;
    background: var(--muted, transparent);
    color: inherit;
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .svadmin-phone-input__country:focus-visible { outline: none; }

  .svadmin-phone-input__control {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 0.375rem;
    padding-inline: 0.625rem;
  }

  .svadmin-phone-input__dial {
    flex: none;
    color: var(--muted-foreground, currentColor);
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
  }

  .svadmin-phone-input__field {
    width: 100%;
    min-width: 0;
    border: 0;
    padding-block: 0.5rem;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.875rem;
  }

  .svadmin-phone-input__field:focus { outline: none; }
</style>