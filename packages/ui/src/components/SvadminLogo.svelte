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
  class="inline-block shrink-0 rounded-lg bg-gradient-to-tr from-primary to-purple-500 shadow-sm {onDark ? 'ring-1 ring-white/35' : ''}"
  style:width={`${size}px`}
  style:height={`${size}px`}
></span>
