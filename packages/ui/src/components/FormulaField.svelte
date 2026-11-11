<script lang="ts">
  import { Calculator, Edit3, Lock } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { evaluateFormula, type FormulaScope } from './useFormulaEngine.svelte.js';

  export interface FormulaFieldProps {
    label?: string | undefined;
    formula: string;
    scope?: FormulaScope | undefined;
    precision?: number | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
    placeholder?: string | undefined;
    showFormulaTooltip?: boolean | undefined;
    allowManualOverride?: boolean | undefined;
    manualValue?: (number | string) | undefined;
    class?: string | undefined;
    onchange?: ((computedValue: number | null, isManual: boolean) => void) | undefined;
  }

  let {
    label,
    formula,
    scope = {},
    precision = 2,
    prefix = '',
    suffix = '',
    placeholder = '0.00',
    showFormulaTooltip = true,
    allowManualOverride = false,
    manualValue = $bindable(undefined),
    class: className = '',
    onchange,
  }: FormulaFieldProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let isManualMode = $state(false);

  const computedValue = $derived.by(() => {
    const raw = evaluateFormula(formula, scope);
    if (raw === null || !Number.isFinite(raw)) return null;
    if (precision !== undefined) {
      const factor = Math.pow(10, precision);
      return Math.round(raw * factor) / factor;
    }
    return raw;
  });

  const displayValue = $derived.by(() => {
    if (isManualMode && manualValue !== undefined) {
      return String(manualValue);
    }
    if (computedValue === null) return '';
    return computedValue.toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  });

  $effect(() => {
    onchange?.(computedValue, isManualMode);
  });

  function toggleManual() {
    isManualMode = !isManualMode;
    if (!isManualMode) {
      manualValue = undefined;
    } else if (computedValue !== null) {
      manualValue = computedValue;
    }
  }

  const resolvedLabel = $derived(label ?? (chinese ? '公式自动计算字段' : 'Formula Field'));
</script>

<div
  data-svadmin-component="FormulaField"
  data-manual={isManualMode ? 'true' : 'false'}
  class={cn('space-y-1.5 text-xs', className)}
>
  <!-- Label & Formula Badge Bar -->
  <div class="flex items-center justify-between">
    <label class="flex items-center gap-1.5 font-medium text-foreground">
      <Calculator class="h-3.5 w-3.5 text-primary" />
      <span>{resolvedLabel}</span>
    </label>

    <div class="flex items-center gap-1.5 text-[11px]">
      {#if showFormulaTooltip}
        <span
          class="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-primary font-semibold"
          title={chinese ? `计算公式: ${formula}` : `Formula: ${formula}`}
        >
          <span>f(x):</span>
          <span class="max-w-32 truncate">{formula}</span>
        </span>
      {/if}

      {#if allowManualOverride}
        <button
          type="button"
          onclick={toggleManual}
          class="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          title={isManualMode ? (chinese ? '切回公式自动计算' : 'Switch to Auto') : (chinese ? '手动修改覆盖' : 'Override')}
        >
          {#if isManualMode}
            <Lock class="h-3 w-3 text-warning" />
            <span class="text-warning font-medium">{chinese ? '已手动覆盖' : 'Overridden'}</span>
          {:else}
            <Edit3 class="h-3 w-3" />
            <span>{chinese ? '手动覆盖' : 'Override'}</span>
          {/if}
        </button>
      {/if}
    </div>
  </div>

  <!-- Formatted Display Input -->
  <div class="relative flex items-center">
    {#if prefix}
      <span class="absolute left-2.5 font-mono text-muted-foreground select-none">
        {prefix}
      </span>
    {/if}

    <input
      type="text"
      readonly={!isManualMode}
      value={displayValue}
      oninput={(e) => (manualValue = (e.target as HTMLInputElement).value)}
      {placeholder}
      class={cn(
        'h-8.5 w-full rounded-md border font-mono text-xs shadow-2xs transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        isManualMode ? 'bg-background border-warning text-foreground' : 'bg-muted/40 border-input text-foreground font-semibold cursor-default',
        prefix ? 'pl-7' : 'pl-3',
        suffix ? 'pr-7' : 'pr-3',
      )}
    />

    {#if suffix}
      <span class="absolute right-2.5 font-mono text-muted-foreground select-none">
        {suffix}
      </span>
    {/if}
  </div>
</div>
