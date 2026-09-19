<script lang="ts">
  import { Input } from './ui/input/index.js';
  import { cn } from '../utils.js';

  export type DateTimeInputMode = 'date' | 'time' | 'datetime';

  interface Props {
    value?: string | null;
    mode?: DateTimeInputMode;
    min?: string;
    max?: string;
    step?: number;
    id?: string;
    name?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string;
    class?: string;
    onchange?: (value: string | null) => void;
  }

  let {
    value = $bindable(null),
    mode = 'date',
    min,
    max,
    step,
    id,
    name,
    disabled = false,
    required = false,
    invalid = false,
    describedby,
    class: className = '',
    onchange,
  }: Props = $props();

  const inputType = $derived(mode === 'datetime' ? 'datetime-local' : mode);

  function handleInput(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    const next = input.value === '' ? null : input.value;
    value = next;
    onchange?.(next);
  }
</script>

<div class={cn('svadmin-u-6da6a3c3f741', className)} data-date-time-input={mode}>
  <Input
    {id}
    {name}
    type={inputType}
    value={value ?? ''}
    {min}
    {max}
    {step}
    {disabled}
    {required}
    aria-invalid={invalid || undefined}
    aria-describedby={describedby}
    oninput={handleInput}
  />
</div>
