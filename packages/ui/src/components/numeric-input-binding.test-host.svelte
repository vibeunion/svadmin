<script lang="ts">
  import MoneyInput from './MoneyInput.svelte';
  import NumberInput from './NumberInput.svelte';
  import PercentInput from './PercentInput.svelte';
  import type { NumericInputMode } from './NumericInput.svelte';

  let { onchange }: {
    onchange?: (mode: NumericInputMode, value: number | null) => void;
  } = $props();

  let numberValue = $state<number | null>(null);
  let moneyValue = $state<number | null>(null);
  let percentValue = $state<number | null>(null);
</script>

<label for="bound-number">Number</label>
<NumberInput id="bound-number" bind:value={numberValue} onchange={value => onchange?.('number', value)} />
<label for="bound-money">Money</label>
<MoneyInput id="bound-money" bind:value={moneyValue} currency="CNY" onchange={value => onchange?.('currency', value)} />
<label for="bound-percent">Percent</label>
<PercentInput id="bound-percent" bind:value={percentValue} scale="1" onchange={value => onchange?.('percent', value)} />
<button type="button" onclick={() => { numberValue = 0; moneyValue = 12.5; percentValue = 0.6; }}>Set parent values</button>
<button type="button" onclick={() => { numberValue = null; moneyValue = null; percentValue = null; }}>Clear parent values</button>
<output data-testid="number-value">{numberValue === null ? 'null' : numberValue}</output>
<output data-testid="money-value">{moneyValue === null ? 'null' : moneyValue}</output>
<output data-testid="percent-value">{percentValue === null ? 'null' : percentValue}</output>
