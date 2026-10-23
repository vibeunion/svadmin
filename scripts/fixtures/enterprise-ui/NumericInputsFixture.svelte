<script lang="ts">
  import NumberInput from '../../../packages/ui/src/components/NumberInput.svelte';
  import MoneyInput from '../../../packages/ui/src/components/MoneyInput.svelte';
  import PercentInput from '../../../packages/ui/src/components/PercentInput.svelte';
  import type { NumericInputLocale } from '../../../packages/ui/src/components/numeric-format.js';

  let numberValue = $state<number | null>(null);
  let moneyValue = $state<number | null>(null);
  let percentValue = $state<number | null>(null);
  let changes = $state(0);
  let localeEn = $state<number | null>(1234.5);
  let localeDe = $state<number | null>(12.5);
  let localeZh = $state<number | null>(0.25);
  let localeChanges = $state(0);
  let nativeAmount = $state<number | null>(1234.5);
  let nativeRate = $state<number | null>(0.255);
  let requiredAmount = $state<number | null>(null);
  let localeSubmissions = $state(0);
  let localeSubmitted = $state('No locale submission');
  let switchingLocale = $state<NumericInputLocale>('en-US');
  let switchingValue = $state<number | null>(1.5);
  let arrowAnyValue = $state<number | null>(2);
  let arrowStepValue = $state<number | null>(1.23456);
  let boundaryValue = $state<number | null>(11);
  let boundaryChanges = $state(0);
  let overflowValue = $state<number | null>(Number.MAX_VALUE);
  let overflowChanges = $state(0);
  let compositionValue = $state<number | null>(5);
  let compositionChanges = $state(0);
  const unsupportedLocale = 'fr-FR' as NumericInputLocale;
  let unsupportedValue = $state<number | null>(12.5);
  function localeChanged(): void {
    localeChanges += 1;
  }
  function submitLocale(event: SubmitEvent): void {
    event.preventDefault();
    localeSubmissions += 1;
    localeSubmitted = JSON.stringify(Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement).entries()));
  }
  function changed(): void {
    changes += 1;
  }
  function boundaryChanged(): void {
    boundaryChanges += 1;
  }
  function overflowChanged(): void {
    overflowChanges += 1;
  }
  function compositionChanged(): void {
    compositionChanges += 1;
  }
  function setValues(): void {
    numberValue = 0;
    moneyValue = 12.5;
    percentValue = 0.6;
  }
  function clearValues(): void {
    numberValue = null;
    moneyValue = null;
    percentValue = null;
  }
</script>

<main data-testid="numeric-fixture">
  <button type="button" onclick={setValues}>Set parent values</button>
  <button type="button" onclick={clearValues}>Clear parent values</button>
  <label>Number <NumberInput bind:value={numberValue} onchange={changed} /></label>
  <label>Money <MoneyInput currency="CNY" bind:value={moneyValue} onchange={changed} /></label>
  <label>Percent <PercentInput scale="1" bind:value={percentValue} onchange={changed} /></label>
  <output data-testid="number-value">{String(numberValue)}</output>
  <output data-testid="money-value">{String(moneyValue)}</output>
  <output data-testid="percent-value">{String(percentValue)}</output>
  <output data-testid="numeric-changes">{changes}</output>
  <section data-testid="numeric-locale-fixture">
    <label>Locale en number <NumberInput locale="en-US" precision={2} bind:value={localeEn} onchange={localeChanged} /></label>
    <label>Locale de money <MoneyInput locale="de-DE" currency="EUR" precision={2} bind:value={localeDe} onchange={localeChanged} /></label>
    <label>Locale zh percent <PercentInput locale="zh-CN" scale="1" precision={1} bind:value={localeZh} onchange={localeChanged} /></label>
    <output data-testid="locale-en-value">{String(localeEn)}</output>
    <output data-testid="locale-de-value">{String(localeDe)}</output>
    <output data-testid="locale-zh-value">{String(localeZh)}</output>
    <output data-testid="locale-changes">{localeChanges}</output>
  </section>
  <form data-testid="locale-native-form" onsubmit={submitLocale}>
    <label>Native amount <NumberInput name="amount" locale="de-DE" precision={2} bind:value={nativeAmount} /></label>
    <label>Native percent <PercentInput name="rate" locale="de-DE" scale="1" precision={1} bind:value={nativeRate} /></label>
    <button type="submit">Submit locale form</button>
    <output data-testid="locale-submitted">{localeSubmitted}</output>
    <output data-testid="locale-submissions">{localeSubmissions}</output>
  </form>
  <form data-testid="locale-required-form" onsubmit={submitLocale}>
    <label>Required amount <NumberInput name="requiredAmount" required locale="en-US" bind:value={requiredAmount} /></label>
    <label>Disabled amount <NumberInput name="disabledAmount" disabled locale="en-US" value={7} /></label>
    <button type="button" onclick={() => requiredAmount = 0}>Set required zero</button>
    <button type="submit">Submit required form</button>
  </form>
  <section data-testid="locale-lifecycle-fixture">
    <label>Switch locale number <NumberInput name="switch" locale={switchingLocale} bind:value={switchingValue} /></label>
    <button type="button" onclick={() => switchingLocale = 'de-DE'}>Use de-DE</button>
    <output data-testid="switch-value">{String(switchingValue)}</output>
    <label>Arrow any number <NumberInput name="arrowAny" locale="en-US" bind:value={arrowAnyValue} /></label>
    <label>Arrow step number <NumberInput name="arrowStep" locale="en-US" step={0.001} precision={2} bind:value={arrowStepValue} /></label>
    <output data-testid="arrow-any-value">{String(arrowAnyValue)}</output>
    <output data-testid="arrow-step-value">{String(arrowStepValue)}</output>
    <label>Unsupported locale <NumberInput name="unsupported" locale={unsupportedLocale} bind:value={unsupportedValue} /></label>
  </section>
  <section data-testid="locale-boundary-fixture">
    <form data-testid="locale-boundary-form" onsubmit={submitLocale}>
      <label>Boundary amount <NumberInput name="boundaryAmount" locale="en-US" min={0} max={10} bind:value={boundaryValue} onchange={boundaryChanged} /></label>
      <button type="button" onclick={() => boundaryValue = 11}>Set above max</button>
      <button type="button" onclick={() => boundaryValue = -1}>Set below min</button>
      <button type="button" onclick={() => boundaryValue = 8}>Set valid boundary</button>
      <button type="button" onclick={() => boundaryValue = Number.NaN}>Set NaN</button>
      <button type="button" onclick={() => boundaryValue = Number.POSITIVE_INFINITY}>Set infinity</button>
      <button type="submit">Submit boundary form</button>
      <output data-testid="boundary-value">{String(boundaryValue)}</output>
      <output data-testid="boundary-changes">{boundaryChanges}</output>
    </form>
    <form data-testid="locale-overflow-form" onsubmit={submitLocale}>
      <label>Overflow percent <PercentInput name="overflowRate" locale="en-US" scale="1" bind:value={overflowValue} onchange={overflowChanged} /></label>
      <button type="button" onclick={() => overflowValue = 0.5}>Set valid percent</button>
      <button type="button" onclick={() => overflowValue = Number.MAX_VALUE}>Set percent overflow</button>
      <button type="submit">Submit overflow form</button>
      <output data-testid="overflow-value">{String(overflowValue)}</output>
      <output data-testid="overflow-changes">{overflowChanges}</output>
    </form>
    <form data-testid="locale-composition-form" onsubmit={submitLocale}>
      <label>Composition amount <NumberInput name="compositionAmount" locale="en-US" bind:value={compositionValue} onchange={compositionChanged} /></label>
      <button type="submit">Submit composition form</button>
      <output data-testid="composition-value">{String(compositionValue)}</output>
      <output data-testid="composition-changes">{compositionChanges}</output>
    </form>
  </section>
</main>
