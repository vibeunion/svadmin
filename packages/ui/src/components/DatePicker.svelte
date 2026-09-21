<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import DateTimeInput from './DateTimeInput.svelte';

  export type DatePickerProps = Omit<ComponentProps<typeof DateTimeInput>, 'mode'>;

  let props: DatePickerProps = $props();
</script>

<DateTimeInput {...props} mode="date" />
