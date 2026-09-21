<script lang="ts">
  let { label, count, total, amount }: {
    label: string;
    count: number;
    total: number;
    amount?: string;
  } = $props();

  const percentage = $derived(total > 0 ? Math.min(100, Math.max(0, count / total * 100)) : 0);
</script>

<div class="stage">
  <div class="heading">
    <span class="label">{label}</span>
    <span class="count">{count}</span>
  </div>
  <div
    class="track"
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={percentage}
  >
    <div class="fill" style:width={`${percentage}%`}></div>
  </div>
  {#if amount}<div class="amount">{amount}</div>{/if}
</div>

<style>
  .stage {
    min-width: 0;
    padding: 16px 0;
    border-bottom: 1px solid var(--border);
  }

  .heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 8px;
    font-size: 14px;
    line-height: 20px;
    color: var(--foreground);
  }

  .label { overflow-wrap: anywhere; font-weight: 500; }
  .count { flex-shrink: 0; font-variant-numeric: tabular-nums; }

  .track {
    height: 6px;
    width: 100%;
    overflow: hidden;
    border-radius: 999px;
    background: var(--muted);
  }

  .fill {
    height: 100%;
    border-radius: inherit;
    background: var(--primary);
    transition: width 200ms ease-out;
  }

  .amount {
    margin-top: 8px;
    font-size: 12px;
    line-height: 16px;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
    color: var(--muted-foreground);
  }

  @media (prefers-reduced-motion: reduce) {
    .fill { transition: none; }
  }
</style>
