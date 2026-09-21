<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import DateTimeInput from './DateTimeInput.svelte';

  export type DateTimePickerProps = Omit<ComponentProps<typeof DateTimeInput>, 'mode'>;

  let props: DateTimePickerProps = $props();
</script>

<DateTimeInput {...props} mode="datetime" />
