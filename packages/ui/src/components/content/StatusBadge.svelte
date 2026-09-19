<script lang="ts">
  import { Badge } from '../ui/badge/index.js';
  import { productStatus } from '../../styled-system/recipes/index.js';
  export type Status = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  interface Props {
    status: Status;
    label?: string;
    class?: string;
  }
  let { status, label = status, class: className = '' }: Props = $props();
  const styles = $derived(productStatus({ status }));
</script>

<Badge variant="outline" data-svadmin-status={status} class={styles.root + ' ' + className}>{label}</Badge>
