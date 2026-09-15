<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import Button from '../../src/components/ui/button/button.svelte';
  import type { ButtonProps } from '../../src/components/ui/button/button.svelte';

  let {
    disabled = false,
    disabledReason = '',
    href,
    label = 'Command action',
    onclick,
    ariaLabel,
    restrictionClass,
    restrictionStyle,
  }: {
    disabled?: boolean;
    disabledReason?: string;
    href?: string;
    label?: string;
    onclick?: ButtonProps['onclick'];
    ariaLabel?: string;
    restrictionClass?: string;
    restrictionStyle?: string;
  } = $props();
</script>

<Button {disabled} {disabledReason} {...definedOptions({ href, onclick, restrictionClass, restrictionStyle, 'aria-label': ariaLabel })}>{label}</Button>
