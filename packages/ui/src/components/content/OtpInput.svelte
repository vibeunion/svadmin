<script lang="ts">
  import { Input } from '../ui/input/index.js';
  interface Props {
    value?: string[];
    length?: number;
    disabled?: boolean;
    'aria-label'?: string;
    class?: string;
  }
  let {
    value = $bindable<string[]>([]),
    length = 6,
    disabled = false,
    'aria-label': ariaLabel = 'One-time password',
    class: className = '',
  }: Props = $props();

  const slots = $derived(Array.from({ length }, (_, index) => index));

  function updateDigit(event: Event, index: number) {
    const input = event.currentTarget as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    const next = [...value];
    while (next.length < length) next.push('');
    next[index] = digit;
    value = next;
    if (digit && index < length - 1) {
      const inputs = input.parentElement?.querySelectorAll('input');
      const sibling = inputs?.[index + 1] as HTMLInputElement | undefined;
      sibling?.focus();
    }
  }

  function handleKeydown(event: KeyboardEvent, index: number) {
    const input = event.currentTarget as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && index > 0) {
      const inputs = input.parentElement?.querySelectorAll('input');
      const prev = inputs?.[index - 1] as HTMLInputElement | undefined;
      prev?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text/plain') ?? '';
    const digits = pasted.replace(/\D/g, '').slice(0, length).split('');
    if (digits.length === 0) return;
    const next = [...value];
    while (next.length < length) next.push('');
    digits.forEach((digit, i) => {
      next[i] = digit;
    });
    value = next;
    const targetIndex = Math.min(digits.length, length - 1);
    const inputs = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll('input');
    inputs?.[targetIndex]?.focus();
  }
</script>

<div class={'flex justify-center gap-2 ' + className} role="group" aria-label={ariaLabel}>
  {#each slots as index (index)}
    <Input
      class="size-12 text-center text-lg font-semibold tabular-nums"
      value={value[index] ?? ''}
      maxlength={1}
      inputmode="numeric"
      pattern="[0-9]*"
      autocomplete="one-time-code"
      aria-label={ariaLabel + ' digit ' + (index + 1)}
      {disabled}
      oninput={(event) => updateDigit(event, index)}
      onkeydown={(event) => handleKeydown(event, index)}
      onpaste={handlePaste}
    />
  {/each}
</div>
