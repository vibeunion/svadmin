<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  import AuditSection from './AuditSection.svelte';
  import type { AuditDataState } from './audit-state.js';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    children?: Snippet;
    class?: string;
    state?: AuditDataState;
    message?: string | undefined;
    retry?: (() => void) | undefined;
  }

  let {
    title,
    description,
    actions,
    children,
    class: className = '',
    state = 'ready',
    message,
    retry,
  }: Props = $props();
</script>

<AuditSection {title} {description} {actions} {state} {message} {retry} accent="info" class={cn('svadmin-chart-container', className)}>
  <div class="svadmin-chart-container__body">{@render children?.()}</div>
</AuditSection>
