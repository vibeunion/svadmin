<script lang="ts">
  import NumericInput from './NumericInput.svelte';
  import type { NumericInputLocale } from './numeric-format.js';

  interface Props {
    value?: number | null | undefined;
    locale?: NumericInputLocale | undefined;
    scale?: '100' | '1' | undefined;
    min?: number | undefined;
    max?: number | undefined;
    step?: number | undefined;
    precision?: number | undefined;
    id?: string | undefined;
    name?: string | undefined;
    placeholder?: string | undefined;
    disabled?: boolean | undefined;
    required?: boolean | undefined;
    invalid?: boolean | undefined;
    describedby?: string | undefined;
    class?: string | undefined;
    onchange?: ((value: number | null) => void) | undefined;
  }

  let { value = $bindable(null), ...props }: Props = $props();
</script>

<NumericInput {...props} bind:value mode="percent" />
