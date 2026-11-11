<script lang="ts">
  interface Props {
    label?: string;
    formula?: string;
    value?: number | string | null;
    prefix?: string;
    suffix?: string;
    class?: string;
  }

  let {
    label = 'Formula Field',
    formula = 'a * b',
    value = 0,
    prefix = '',
    suffix = '',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-formula-field {className}"
  data-svadmin-component="LiteFormulaField"
>
  <div class="lite-formula-header">
    <span class="lite-formula-label">{label}</span>
    <span class="lite-formula-badge">f(x): {formula}</span>
  </div>
  <div class="lite-formula-box">
    {#if prefix}<span class="lite-formula-prefix">{prefix}</span>{/if}
    <span class="lite-formula-val">{value ?? '0.00'}</span>
    {#if suffix}<span class="lite-formula-suffix">{suffix}</span>{/if}
  </div>
</div>

<style>
  .lite-formula-field { margin-bottom: 12px; font-size: 12px; }
  .lite-formula-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .lite-formula-label { font-weight: 600; color: #4e5969; }
  .lite-formula-badge { font-family: monospace; font-size: 11px; background: #e8f3ff; color: #165dff; padding: 1px 6px; border-radius: 4px; }
  .lite-formula-box { background: #f7f8fa; border: 1px solid #e5e6eb; border-radius: 4px; padding: 6px 10px; font-family: monospace; font-weight: 600; color: #1d2129; }
  .lite-formula-prefix { margin-right: 4px; color: #86909c; }
  .lite-formula-suffix { margin-left: 4px; color: #86909c; }
</style>
