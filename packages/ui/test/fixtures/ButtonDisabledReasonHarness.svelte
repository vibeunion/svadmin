<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import Button from '../../src/components/ui/button/button.svelte';

  let {
    disabled = false,
    disabledReason = '',
    href,
    label = 'Command action',
  }: {
    disabled?: boolean;
    disabledReason?: string;
    href?: string;
    label?: string;
  } = $props();
</script>

<Button {disabled} {disabledReason} {...definedOptions({ href })}>{label}</Button>
