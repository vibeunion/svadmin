<script lang="ts">
  import NumericInput from './NumericInput.svelte';
  import type { NumericInputLocale } from './numeric-format.js';

  interface Props {
    value?: number | null;
    locale?: NumericInputLocale | undefined;
    scale?: '100' | '1';
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

  let { value = $bindable(null), ...props }: Props = $props();
</script>

<NumericInput {...props} bind:value mode="percent" />
