<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import PermissionMatrix from './PermissionMatrix.svelte';

  let { settings, onsubmit }: {
    settings: ComponentProps<typeof PermissionMatrix>;
    onsubmit: (event: SubmitEvent) => void;
  } = $props();
</script>

<form {onsubmit}>
  <PermissionMatrix {...settings} />
  <button type="submit">Submit host form</button>
</form>
