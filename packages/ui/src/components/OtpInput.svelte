<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { cn } from '../utils.js';

  export interface OtpInputProps {
    length?: number;
    value?: string | string[];
    defaultValue?: string | string[];
    type?: 'number' | 'text' | 'alphanumeric';
    mask?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    error?: boolean;
    status?: 'error' | 'warning' | 'normal';
    autoFocus?: boolean;
    size?: 'mini' | 'small' | 'default' | 'large' | 'sm' | 'md' | 'lg';
    separator?: string;
    class?: string;
    'aria-label'?: string;
    onchange?: (value: string) => void;
    oncomplete?: (value: string) => void;
  }

  let {
    length = 6,
    value = $bindable(),
    defaultValue = '',
    type = 'alphanumeric',
    mask = false,
    disabled = false,
    readonly = false,
    error = false,
    status = 'normal',
    autoFocus = false,
    size = 'md',
    separator,
    class: className = '',
    'aria-label': groupAriaLabel = 'OTP verification code input',
    onchange,
    oncomplete,
  }: OtpInputProps = $props();

  const isError = $derived(error || status === 'error');
  const normalizedSize = $derived.by(() => {
    if (size === 'mini' || size === 'small' || size === 'sm') return 'sm';
    if (size === 'large' || size === 'lg') return 'lg';
    return 'md';
  });

  let internalValue = $state(untrack(() => defaultValue));
  const effectiveValue = $derived(value !== undefined ? value : internalValue);

  let digits = $state<string[]>([]);
  const inputRefs: (HTMLInputElement | null)[] = [];

  function registerInput(node: HTMLInputElement, index: number) {
    inputRefs[index] = node;
    return {
      destroy() {
        if (inputRefs[index] === node) {
          inputRefs[index] = null;
        }
      },
    };
  }

  function isValidChar(char: string): boolean {
    if (type === 'number') {
      return /^[0-9]$/.test(char);
    }
    if (type === 'alphanumeric') {
      return /^[a-zA-Z0-9]$/.test(char);
    }
    return char.length === 1;
  }

  function getRawStringValue(): string {
    if (Array.isArray(effectiveValue)) {
      return effectiveValue.join('');
    }
    return effectiveValue || '';
  }

  function syncFromValue() {
    const raw = getRawStringValue();
    const chars = raw.split('').slice(0, length);
    const newDigits = Array.from({ length }, (_, i) => chars[i] || '');
    digits = newDigits;
  }

  function notifyChange() {
    const combined = digits.join('');
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value = [...digits];
      } else {
        value = combined;
      }
    } else {
      if (Array.isArray(internalValue)) {
        internalValue = [...digits];
      } else {
        internalValue = combined;
      }
    }
    onchange?.(combined);
    if (combined.length === length && digits.every((d) => d !== '')) {
      oncomplete?.(combined);
    }
  }

  function handleInput(e: Event, index: number) {
    if (disabled || readonly) return;
    const input = e.target as HTMLInputElement;
    const rawVal = input.value;
    const char = rawVal.slice(-1);

    if (char && isValidChar(char)) {
      digits[index] = char;
      if (index < length - 1) {
        inputRefs[index + 1]?.focus();
      }
    } else {
      digits[index] = '';
    }

    notifyChange();
  }

  function handleKeyDown(e: KeyboardEvent, index: number) {
    if (disabled || readonly) return;
    if (e.key === 'Backspace') {
      if (digits[index] !== '') {
        digits[index] = '';
        notifyChange();
      } else if (index > 0) {
        digits[index - 1] = '';
        inputRefs[index - 1]?.focus();
        notifyChange();
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      if (index > 0) {
        inputRefs[index - 1]?.focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowRight') {
      if (index < length - 1) {
        inputRefs[index + 1]?.focus();
        e.preventDefault();
      }
    }
  }

  function handlePaste(e: ClipboardEvent) {
    if (disabled || readonly) return;
    e.preventDefault();
    const pastedText = e.clipboardData?.getData('text') || '';
    if (!pastedText) return;

    let validChars = '';
    for (const char of pastedText) {
      if (isValidChar(char)) {
        validChars += char;
        if (validChars.length === length) break;
      }
    }

    if (!validChars) return;

    const newDigits = [...digits];
    for (let i = 0; i < length; i++) {
      const char = validChars[i];
      if (char) {
        newDigits[i] = char;
      }
    }
    digits = newDigits;
    notifyChange();

    const nextIndex = Math.min(validChars.length, length - 1);
    inputRefs[nextIndex]?.focus();
  }

  $effect(() => {
    const raw = getRawStringValue();
    if (digits.length !== length || raw !== digits.join('')) {
      syncFromValue();
    }
  });

  onMount(() => {
    syncFromValue();
    if (autoFocus && inputRefs[0]) {
      inputRefs[0].focus();
    }
  });

  const sizeClasses = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-9 w-9 text-base',
  };
</script>

<div
  class={cn('inline-flex items-center gap-2', className)}
  data-svadmin-component="OtpInput"
  role="group"
  aria-label={groupAriaLabel}
>
  {#each digits as digit, index (index)}
    {#if separator && index > 0 && index % 3 === 0}
      <span class="svadmin-otp-separator text-muted-foreground font-mono select-none" aria-hidden="true">{separator}</span>
    {/if}
    <input
      use:registerInput={index}
      type={mask ? 'password' : 'text'}
      inputmode={type === 'number' ? 'numeric' : 'text'}
      pattern={type === 'number' ? '[0-9]*' : undefined}
      maxlength={1}
      value={digit}
      {disabled}
      {readonly}
      aria-label={`Digit ${index + 1} of ${length}`}
      aria-invalid={isError ? 'true' : undefined}
      class={cn(
        'rounded-sm border text-center font-mono font-semibold transition-all outline-none',
        'focus:border-primary focus:ring-2 focus:ring-primary/20',
        sizeClasses[normalizedSize],
        isError
          ? 'border-destructive text-destructive focus:ring-destructive'
          : 'border-input bg-background text-foreground',
        disabled ? 'cursor-not-allowed bg-muted opacity-50' : 'cursor-text'
      )}
      oninput={(e) => handleInput(e, index)}
      onkeydown={(e) => handleKeyDown(e, index)}
      onpaste={handlePaste}
      onfocus={(e) => (e.target as HTMLInputElement).select()}
    />
  {/each}
</div>
