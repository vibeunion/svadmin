<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import DateRangeInput from './DateRangeInput.svelte';

  export type DateRangePickerProps = Omit<ComponentProps<typeof DateRangeInput>, 'mode'>;

  let props: DateRangePickerProps = $props();
</script>

<DateRangeInput {...props} mode="date" />
