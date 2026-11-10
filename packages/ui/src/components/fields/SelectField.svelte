<script lang="ts">
  import { Badge } from '../ui/badge/index.js';

  let { value, options }: {
    value: string | number | null | undefined;
    options?: { label: string; value: string | number }[];
  } = $props();

  const label = $derived(
    options?.find((o: { label: string; value: string | number }) => o.value === value)?.label ?? (value != null ? String(value) : '—')
  );
</script>

<Badge variant="outline">{label}</Badge>
