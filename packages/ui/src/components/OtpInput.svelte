<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '../utils.js';

  export interface OtpInputProps {
    length?: number;
    value?: string | string[];
    type?: 'number' | 'text' | 'alphanumeric';
    mask?: boolean;
    disabled?: boolean;
    error?: boolean;
    autoFocus?: boolean;
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    'aria-label'?: string;
    onchange?: (value: string) => void;
    oncomplete?: (value: string) => void;
  }

  let {
    length = 6,
    value = $bindable(''),
    type = 'alphanumeric',
    mask = false,
    disabled = false,
    error = false,
    autoFocus = false,
    size = 'md',
    class: className = '',
    'aria-label': groupAriaLabel = 'OTP verification code input',
    onchange,
    oncomplete,
  }: OtpInputProps = $props();

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
    if (Array.isArray(value)) {
      return value.join('');
    }
    return value || '';
  }

  function syncFromValue() {
    const raw = getRawStringValue();
    const chars = raw.split('').slice(0, length);
    const newDigits = Array.from({ length }, (_, i) => chars[i] || '');
    digits = newDigits;
  }

  function notifyChange() {
    const combined = digits.join('');
    if (Array.isArray(value)) {
      value = [...digits];
    } else {
      value = combined;
    }
    onchange?.(combined);
    if (combined.length === length && digits.every((d) => d !== '')) {
      oncomplete?.(combined);
    }
  }

  function handleInput(e: Event, index: number) {
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
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
  };
</script>

<div
  class={cn('inline-flex items-center gap-2', className)}
  data-svadmin-component="OtpInput"
  role="group"
  aria-label={groupAriaLabel}
>
  {#each digits as digit, index (index)}
    <input
      use:registerInput={index}
      type={mask ? 'password' : 'text'}
      inputmode={type === 'number' ? 'numeric' : 'text'}
      pattern={type === 'number' ? '[0-9]*' : undefined}
      maxlength={1}
      value={digit}
      {disabled}
      aria-label={`Digit ${index + 1} of ${length}`}
      aria-invalid={error ? 'true' : undefined}
      class={cn(
        'rounded-md border text-center font-mono font-semibold transition-all outline-none',
        'focus:ring-2 focus:ring-primary focus:ring-offset-2',
        sizeClasses[size],
        error
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
