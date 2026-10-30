<script lang="ts">
  interface Props {
    href?: string;
    label?: string;
    thresholdText?: string;
  }

  let { href = '#top', label = 'Back to top', thresholdText = '↑ Top' }: Props = $props();
</script>

<a class="lite-back-top" {href} aria-label={label}>{thresholdText}</a>

<style>
  .lite-back-top { position: fixed; right: 24px; bottom: 80px; display: inline-grid; place-items: center; min-width: 40px; height: 40px; padding: 0 12px; border: 1px solid #E5E6EB; border-radius: 999px; background: #fff; color: #1D2129; box-shadow: 0 6px 20px rgba(29, 33, 41, 0.16); font-size: 12px; text-decoration: none; }
  .lite-back-top:hover { color: #165DFF; text-decoration: none; }
</style>
