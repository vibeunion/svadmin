<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import DateTimeInput from './DateTimeInput.svelte';

  export type TimePickerProps = Omit<ComponentProps<typeof DateTimeInput>, 'mode'>;

  let props: TimePickerProps = $props();
</script>

<DateTimeInput {...props} mode="time" />
