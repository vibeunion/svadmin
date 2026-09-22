<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import DateTimeInput from './DateTimeInput.svelte';

  export type DateTimePickerProps = Omit<ComponentProps<typeof DateTimeInput>, 'mode'>;

  let { value = $bindable(null), ...props }: DateTimePickerProps = $props();
</script>

<DateTimeInput {...props} bind:value mode="datetime" />
