<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../../../utils.js';
  import type { HTMLAttributes } from 'svelte/elements';
  import { Ellipsis } from '@lucide/svelte';

  const i18n = useTranslation();
  let { class: className, ...restProps }: HTMLAttributes<HTMLSpanElement> = $props();
</script>

<span
  role="presentation"
  aria-hidden="true"
  data-slot="breadcrumb-ellipsis"
  class={cn("svadmin-breadcrumb-ellipsis", className)}
  {...restProps}
>
  <Ellipsis class="svadmin-breadcrumb-icon" />
  <span class="svadmin-sr-only">{i18n.t('common.more')}</span>
</span>
