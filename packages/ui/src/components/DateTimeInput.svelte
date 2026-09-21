<script lang="ts">
  import { Input } from './ui/input/index.js';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import { civilDateTimeToInstant, parseDateTimeInstant, formatCivilDateTime, type DateTimeValueMode, type DateTimeDisambiguation } from '@svadmin/core/date-time';
  import { untrack } from 'svelte';
  import { dateInputAllowed } from '../date-input-policy.js';

  export type DateTimeInputMode = 'date' | 'time' | 'datetime';

  interface Props {
    value?: string | null;
    mode?: DateTimeInputMode;
    min?: string;
    max?: string;
    minInstant?: string;
    maxInstant?: string;
    step?: number;
    disabledDate?: (date: string) => boolean;
    id?: string;
    name?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string;
    ariaLabel?: string;
    class?: string;
    onchange?: (value: string | null) => void;
    timeZone?: string;
    valueMode?: DateTimeValueMode;
    disambiguation?: DateTimeDisambiguation;
  }

  let {
    value = $bindable(null),
    mode = 'date',
    min,
    max,
    minInstant,
    maxInstant,
    step,
    disabledDate,
    id,
    name,
    disabled = false,
    required = false,
    invalid = false,
    describedby,
    ariaLabel,
    class: className = '',
    onchange,
    timeZone,
    valueMode = 'civil',
    disambiguation = 'reject',
  }: Props = $props();

  const inputType = $derived(mode === 'datetime' ? 'datetime-local' : mode);
  const i18n = useTranslation();
  function toDraft(next: string | null | undefined): string {
    if (!next) return '';
    if (mode !== 'datetime' || valueMode === 'civil') return next;
    const instant = parseDateTimeInstant(next);
    return instant !== undefined && timeZone ? formatCivilDateTime(instant, timeZone) ?? '' : '';
  }
  function toValue(next: string): string | null {
    if (next === '') return null;
    if (mode !== 'datetime' || valueMode === 'civil') return next;
    if (!timeZone) return null;
    // 已带偏移的绑定值已确定重复小时中的具体时间点，不重新猜测。
    if (value && next === toDraft(value) && parseDateTimeInstant(value) !== undefined) return value;
    const instant = civilDateTimeToInstant(next, timeZone, disambiguation);
    return instant === undefined ? null : new Date(instant).toISOString();
  }
  let draft = $state(untrack(() => toDraft(value)));
  let inputRef = $state<HTMLInputElement | null>(null);
  const instantMode = $derived(valueMode === 'instant');
  function instantAllowed(next: string | null): boolean {
    if (!instantMode || next === null) return true;
    const instant = parseDateTimeInstant(next);
    const lower = minInstant === undefined ? undefined : parseDateTimeInstant(minInstant);
    const upper = maxInstant === undefined ? undefined : parseDateTimeInstant(maxInstant);
    return instant !== undefined && (lower === undefined || instant >= lower) && (upper === undefined || instant <= upper);
  }
  const configurationInvalid = $derived(instantMode && (mode !== 'datetime'
    || !timeZone || formatCivilDateTime(0, timeZone) === undefined
    || minInstant !== undefined && parseDateTimeInstant(minInstant) === undefined
    || maxInstant !== undefined && parseDateTimeInstant(maxInstant) === undefined));
  const boundValueInvalid = $derived(instantMode && !!value && toDraft(value) === '');
  const policyInvalid = $derived(configurationInvalid || boundValueInvalid || draft !== '' && (
    !dateInputAllowed(draft, mode, min, max, disabledDate)
    || instantMode && (toValue(draft) === null || !instantAllowed(toValue(draft)))
  ));
  $effect.pre(() => {
    void mode;
    draft = toDraft(value);
  });
  $effect(() => {
    inputRef?.setCustomValidity(policyInvalid ? i18n.t('dateInput.unavailable') : '');
  });

  function handleInput(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || disabled || configurationInvalid) return;
    draft = input.value;
    if (draft && !dateInputAllowed(draft, mode, min, max, disabledDate)) return;
    const next = toValue(input.value);
    if (input.value !== '' && next === null) return;
    if (!instantAllowed(next)) return;
    value = next;
    onchange?.(next);
  }
</script>

<div class={cn('svadmin-u-6da6a3c3f741', className)} data-date-time-input={mode}>
  {#if instantMode && name}
    <input type="hidden" {name} value={value ?? ''} {disabled} />
  {/if}
  <Input
    {id}
    name={instantMode ? undefined : name}
    type={inputType}
    bind:ref={inputRef}
    value={draft}
    {min}
    {max}
    {step}
    {disabled}
    {required}
    aria-invalid={invalid || policyInvalid || undefined}
    aria-describedby={describedby}
    aria-label={ariaLabel}
    oninput={handleInput}
  />
</div>
