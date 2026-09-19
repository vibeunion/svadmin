<script lang="ts">
  import NumericInput from './NumericInput.svelte';
  import type { NumericInputMode } from './NumericInput.svelte';

  interface Props {
    value?: number | null;
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
    describedby?: string;
    class?: string;
    onchange?: (value: number | null) => void;
  }

  let props: Props = $props();
</script>

<NumericInput {...props} mode={'number' satisfies NumericInputMode} />
