<script lang="ts">
  import { Input } from '../ui/input/index.js';
  interface Props { value?: string[]; length?: number; disabled?: boolean; 'aria-label'?: string; class?: string; }
  let { value = $bindable<string[]>([]), length = 6, disabled = false, 'aria-label': ariaLabel = 'One-time password', class: className = '' }: Props = $props();
  const slots = $derived(Array.from({ length }, (_, index) => index));
  function updateDigit(event: Event, index: number) {
    const input = event.currentTarget as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[index] = digit;
    value = next;
    if (digit && index < length - 1) {
      const sibling = input.parentElement?.querySelectorAll('input')[index + 1] as HTMLInputElement | undefined;
      sibling?.focus();
    }
  }
</script>
<div class={'flex justify-center gap-2 ' + className} role="group" aria-label={ariaLabel}>
  {#each slots as index (index)}
    <Input class="size-12 text-center text-lg font-semibold" value={value[index] ?? ''} maxlength={1} inputmode="numeric" pattern="[0-9]*" aria-label={ariaLabel + ' digit ' + (index + 1)} {disabled} oninput={(event) => updateDigit(event, index)} />
  {/each}
</div>
