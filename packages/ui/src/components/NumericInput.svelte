<script lang="ts">
  import { Input } from './ui/input/index.js';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import {
    addNumericStep,
    formatNumericEditingText,
    formatNumericValue,
    isNumericInputLocale,
    parseNumericInput,
    type NumericInputLocale,
  } from './numeric-format.js';

  export type NumericInputMode = 'number' | 'currency' | 'percent';

  interface Props {
    value?: number | null;
    mode?: NumericInputMode;
    currency?: string;
    scale?: '100' | '1';
    locale?: NumericInputLocale | undefined;
    min?: number;
    max?: number;
    step?: number;
    precision?: number;
    id?: string;
    name?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string | undefined;
    class?: string;
    onchange?: (value: number | null) => void;
  }

  let {
    value = $bindable(null),
    mode = 'number',
    currency,
    scale = '100',
    locale,
    min,
    max,
    step,
    precision,
    id,
    name,
    placeholder,
    disabled = false,
    required = false,
    invalid = false,
    describedby,
    class: className = '',
    onchange,
  }: Props = $props();

  const normalizedPrecision = $derived(
    precision == null || !Number.isFinite(precision)
      ? undefined
      : Math.min(20, Math.max(0, Math.trunc(precision))),
  );

  const i18n = useTranslation();
  const localeValue = $derived(isNumericInputLocale(locale) ? locale : undefined);
  const localeRequested = $derived(locale !== undefined);
  const localeUnsupported = $derived(localeRequested && localeValue === undefined);

  let localeFocused = $state(false);
  let localeDraft = $state<string | null>(null);
  let localeInvalid = $state(false);
  let observedValue = $state<number | null | undefined>(undefined);
  let observedLocale = $state<string | NumericInputLocale | undefined>(undefined);
  let localeInputElement = $state<HTMLInputElement | null>(null);
  let localeComposing = $state(false);
  let composedText: string | null = null;

  const localeBoundaryInvalid = $derived.by(() => {
    if (!localeRequested || value == null) return false;
    if (!Number.isFinite(value) || !Number.isFinite(displayNumber)) return true;
    const lower = min != null && Number.isFinite(min) ? min : undefined;
    const upper = max != null && Number.isFinite(max) ? max : undefined;
    return (lower !== undefined && value < lower) || (upper !== undefined && value > upper);
  });

  const localeErrorMessage = $derived(
    localeUnsupported
      ? i18n.t('validation.invalidFormat')
      : localeInvalid || localeBoundaryInvalid || localeComposing
        ? i18n.t('validation.invalidNumber')
        : '',
  );

  const displayNumber = $derived.by(() => {
    if (value == null || !Number.isFinite(value)) return null;
    const scaled = mode === 'percent' && scale === '1' ? value * 100 : value;
    return Number.isFinite(scaled) ? scaled : null;
  });

  const displayValue = $derived.by(() => {
    if (displayNumber == null) return '';
    return normalizedPrecision === undefined
      ? String(displayNumber)
      : displayNumber.toFixed(normalizedPrecision);
  });

  const localizedDisplay = $derived(
    localeValue ? formatNumericValue(localeValue, displayNumber, normalizedPrecision) : displayValue,
  );
  const localizedEditing = $derived(
    localeValue
      ? formatNumericEditingText(localeValue, displayNumber, normalizedPrecision)
      : displayValue,
  );

  const inputValue = $derived(
    localeRequested
      ? localeDraft ?? (localeFocused && localeValue ? localizedEditing : localeValue ? localizedDisplay : displayValue)
      : displayValue,
  );

  const submittedValue = $derived(
    value == null || !Number.isFinite(value) ? '' : String(value),
  );
  const hiddenDisabled = $derived(
    disabled || localeInvalid || localeUnsupported || localeBoundaryInvalid || localeComposing,
  );

  $effect(() => {
    if (!localeRequested) return;
    const current = value;
    const finite = current == null || Number.isFinite(current);
    const display = displayNumber;
    if (!finite || display == null) {
      if (!Object.is(current, observedValue)) {
        observedValue = current;
        localeInvalid = false;
      }
      localeDraft = null;
      return;
    }
    if (Object.is(current, observedValue)) return;
    observedValue = current;
    localeInvalid = false;
    localeDraft = localeFocused && localeValue
      ? formatNumericEditingText(localeValue, display, normalizedPrecision)
      : null;
  });

  $effect(() => {
    const nextLocale = locale;
    if (Object.is(nextLocale, observedLocale)) return;
    observedLocale = nextLocale;
    localeFocused = false;
    localeDraft = null;
    localeInvalid = false;
    localeComposing = false;
    composedText = null;
    observedValue = value;
  });

  $effect(() => {
    localeInputElement?.setCustomValidity(localeErrorMessage);
  });

  const displayMin = $derived(mode === 'percent' && scale === '1' && min != null ? min * 100 : min);
  const displayMax = $derived(mode === 'percent' && scale === '1' && max != null ? max * 100 : max);
  const explicitDisplayStep = $derived.by(() => {
    if (step == null || !Number.isFinite(step) || step <= 0) return undefined;
    const scaled = mode === 'percent' && scale === '1' ? step * 100 : step;
    return Number.isFinite(scaled) && scaled > 0 ? scaled : undefined;
  });
  const displayStep = $derived(
    explicitDisplayStep
      ?? (mode === 'percent' && scale === '1'
        ? 1
        : normalizedPrecision === undefined
          ? undefined
          : 10 ** -normalizedPrecision),
  );
  const resolvedStep = $derived(displayStep ?? 'any');

  function clamp(next: number): number {
    return Math.min(max ?? next, Math.max(min ?? next, next));
  }

  function commit(next: number | null): void {
    observedValue = next;
    value = next;
    onchange?.(next);
  }

  function handleLegacyInput(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || disabled) return;
    if (input.value === '') {
      value = null;
      onchange?.(null);
      return;
    }
    const parsed = Number(input.value);
    if (!Number.isFinite(parsed)) return;
    const stored = mode === 'percent' && scale === '1' ? parsed / 100 : parsed;
    const next = clamp(stored);
    value = next;
    onchange?.(next);
  }

  function applyLocaleText(text: string): void {
    if (!localeValue) return;
    localeDraft = text;
    const parsed = parseNumericInput(localeValue, text);
    if (!parsed.ok) {
      localeInvalid = true;
      localeInputElement?.setCustomValidity(i18n.t('validation.invalidNumber'));
      return;
    }
    localeInvalid = false;
    localeInputElement?.setCustomValidity('');
    if (parsed.value === null) {
      commit(null);
      return;
    }
    const stored = mode === 'percent' && scale === '1' ? parsed.value / 100 : parsed.value;
    commit(clamp(stored));
  }

  function handleLocaleInput(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || disabled) return;
    const text = input.value;
    if (localeUnsupported) {
      localeDraft = text;
      return;
    }
    if (!localeValue) return;
    localeDraft = text;
    if (localeComposing || (typeof InputEvent !== 'undefined' && event instanceof InputEvent && event.isComposing)) {
      return;
    }
    if (composedText !== null && text === composedText) {
      composedText = null;
      return;
    }
    composedText = null;
    applyLocaleText(text);
  }

  function handleCompositionStart(): void {
    if (disabled || localeUnsupported || !localeValue) return;
    localeComposing = true;
  }

  function handleCompositionEnd(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || disabled || localeUnsupported || !localeValue) return;
    localeComposing = false;
    composedText = input.value;
    applyLocaleText(input.value);
  }

  function handleLocaleFocus(): void {
    if (disabled || localeUnsupported || !localeValue) return;
    localeFocused = true;
    observedValue = value;
    if (!localeInvalid) localeDraft = localizedEditing;
  }

  function handleLocaleBlur(): void {
    localeFocused = false;
    if (!localeInvalid) localeDraft = null;
  }

  function handleLocaleKeyDown(event: KeyboardEvent): void {
    if (disabled || localeUnsupported || !localeValue) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    if (localeComposing || event.isComposing) return;
    const increment = displayStep !== undefined && Number.isFinite(displayStep) && displayStep > 0
      ? displayStep
      : 1;
    const base = value ?? min ?? 0;
    const displayedBase = mode === 'percent' && scale === '1' ? base * 100 : base;
    const nextDisplayed = addNumericStep(
      displayedBase,
      increment,
      event.key === 'ArrowUp' ? 1 : -1,
    );
    const stored = mode === 'percent' && scale === '1' ? nextDisplayed / 100 : nextDisplayed;
    const next = clamp(stored);
    localeInvalid = false;
    localeInputElement?.setCustomValidity('');
    localeDraft = formatNumericEditingText(
      localeValue,
      mode === 'percent' && scale === '1' ? next * 100 : next,
      normalizedPrecision,
    );
    commit(next);
  }
</script>

<div class={cn('flex items-center justify-between', className)} data-numeric-input={mode}>
  {#if mode === 'currency' && currency}
    <span class="text-muted-foreground shrink-0" aria-hidden="true">{currency}</span>
  {/if}
  {#if localeRequested}
    {#if name}
      <input
        type="hidden"
        {name}
        value={submittedValue}
        disabled={hiddenDisabled}
        data-numeric-submit-value
      />
    {/if}
    <Input
      bind:ref={localeInputElement}
      {id}
      type="text"
      inputmode="decimal"
      role="spinbutton"
      lang={localeValue}
      value={inputValue}
      min={displayMin}
      max={displayMax}
      step={resolvedStep}
      aria-valuemin={displayMin}
      aria-valuemax={displayMax}
      aria-valuenow={displayNumber ?? undefined}
      {placeholder}
      {disabled}
      {required}
      aria-invalid={invalid || localeInvalid || localeBoundaryInvalid || localeUnsupported || undefined}
      aria-describedby={describedby}
      onfocus={handleLocaleFocus}
      onblur={handleLocaleBlur}
      onkeydown={handleLocaleKeyDown}
      oninput={handleLocaleInput}
      oncompositionstart={handleCompositionStart}
      oncompositionend={handleCompositionEnd}
    />
  {:else}
    <Input
      {id}
      {name}
      type="number"
      value={displayValue}
      min={displayMin}
      max={displayMax}
      step={resolvedStep}
      {placeholder}
      {disabled}
      {required}
      aria-invalid={invalid || undefined}
      aria-describedby={describedby}
      oninput={handleLegacyInput}
    />
  {/if}
  {#if mode === 'percent'}
    <span class="text-muted-foreground shrink-0" aria-hidden="true">%</span>
  {/if}
</div>
