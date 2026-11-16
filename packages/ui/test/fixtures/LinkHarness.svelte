<script lang="ts">
  import Link from "../../src/components/Link.svelte";

  let {
    href = "https://example.com",
    icon = false,
  }: {
    href?: string;
    icon?: boolean;
  } = $props();
</script>

<Link {href} {icon}>访问外链</Link>
