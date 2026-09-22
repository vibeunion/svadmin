<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import DateTimeInput from './DateTimeInput.svelte';

  export type TimePickerProps = Omit<ComponentProps<typeof DateTimeInput>, 'mode'>;

  let { value = $bindable(null), ...props }: TimePickerProps = $props();
</script>

<DateTimeInput {...props} bind:value mode="time" />
