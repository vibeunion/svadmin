<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import { untrack } from 'svelte';
  import RadioGroup, { type RadioGroupOption } from './RadioGroup.svelte';

  type Visibility = 'personal' | 'team' | 'company';
  let { named = false, emptyName = false, sharedForm = false, required = false, nativeBoundary = false, initialFirst = null, initialSecond = null, onchange }: {
    named?: boolean;
    emptyName?: boolean;
    sharedForm?: boolean;
    required?: boolean;
    nativeBoundary?: boolean;
    initialFirst?: Visibility | null;
    initialSecond?: Visibility | null;
    onchange?: (group: 'first' | 'second', value: Visibility) => void;
  } = $props();
  const groupName = $derived(named ? 'visibility' : emptyName ? '' : undefined);

  const options: readonly RadioGroupOption<Visibility>[] = [
    { value: 'personal', label: 'Personal', description: 'Only you can access it.' },
    { value: 'team', label: 'Team', disabled: true },
    { value: 'company', label: 'Company' },
  ];
  let first = $state<Visibility | null>(untrack(() => initialFirst));
  let second = $state<Visibility | null>(untrack(() => initialSecond));
</script>

{#snippet firstGroup()}
  <RadioGroup
    {options}
    {required}
    legend="First visibility"
    {...definedOptions({ name: groupName })}
    bind:value={first}
    onchange={value => onchange?.('first', value)}
  />
{/snippet}
{#snippet secondGroup()}
  <RadioGroup
    {options}
    {required}
    legend="Second visibility"
    {...definedOptions({ name: groupName })}
    bind:value={second}
    onchange={value => onchange?.('second', value)}
  />
{/snippet}

{#if sharedForm}
  <form aria-label="Shared form">
    {@render firstGroup()}
    {#if nativeBoundary}<input type="radio" aria-label="Native unnamed boundary" />{/if}
    {@render secondGroup()}
  </form>
{:else}
  <form aria-label="First form">{@render firstGroup()}</form>
  <form aria-label="Second form">{@render secondGroup()}</form>
{/if}
<output data-testid="first-value">{first ?? 'null'}</output>
<output data-testid="second-value">{second ?? 'null'}</output>
