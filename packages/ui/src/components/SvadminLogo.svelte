<script lang="ts">
  let {
    size = 34,
    onDark = false,
  }: {
    size?: number;
    onDark?: boolean;
  } = $props();
</script>

<span
  aria-hidden="true"
  class="svadmin-u-bb0c4bfc52bd svadmin-u-012fbd121f37 svadmin-u-5f22e64f2282 svadmin-u-75b1bec3ea0e svadmin-u-438b2237b8d6 {onDark ? 'svadmin-u-3daca9af0861 svadmin-u-8b434b651a9e' : ''}"
  style:width={`${size}px`}
  style:height={`${size}px`}
></span>
