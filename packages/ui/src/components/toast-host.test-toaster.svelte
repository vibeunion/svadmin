<script lang="ts">
  let {
    theme,
    expand,
    visibleToasts,
  }: {
    theme?: string;
    expand?: boolean;
    visibleToasts?: number;
  } = $props();
</script>

<div
  data-testid="sonner-toaster"
  data-theme={theme}
  data-expand={String(expand)}
  data-visible-toasts={visibleToasts}
></div>
