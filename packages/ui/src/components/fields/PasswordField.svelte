<script lang="ts">
  let { value }: { value: string | null | undefined } = $props();
</script>

<span>{value ? '********' : '—'}</span>
