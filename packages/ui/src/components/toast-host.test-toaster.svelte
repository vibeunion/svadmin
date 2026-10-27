<script lang="ts">
  let {
    theme,
    expand,
    visibleToasts,
    position,
  }: {
    theme?: string;
    expand?: boolean;
    visibleToasts?: number;
    position?: string;
  } = $props();
</script>

<div
  data-testid="sonner-toaster"
  data-theme={theme}
  data-expand={String(expand)}
  data-visible-toasts={visibleToasts}
  data-position={position}
></div>
