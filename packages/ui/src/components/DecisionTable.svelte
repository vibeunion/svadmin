<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Plus, Trash2, Play, CheckCircle2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface DecisionColumn {
    key: string;
    label: string;
    type: 'condition' | 'action';
    dataType?: 'string' | 'number' | 'boolean';
  }

  export interface DecisionRule {
    id: string;
    description?: string;
    values: Record<string, string>; // e.g. { age: "> 18", score: ">= 80", result: "Approved" }
  }

  interface Props {
    title?: string;
    columns?: DecisionColumn[];
    rules?: DecisionRule[];
    hitPolicy?: 'FIRST' | 'COLLECT' | 'UNIQUE';
    onchange?: (rules: DecisionRule[]) => void;
    class?: string;
  }

  let {
    title = 'Business Decision Table',
    columns = [
      { key: 'tier', label: 'Customer Tier', type: 'condition' },
      { key: 'amount', label: 'Order Amount', type: 'condition' },
      { key: 'discount', label: 'Discount %', type: 'action' },
      { key: 'approval', label: 'Require Approval', type: 'action' },
    ],
    rules = $bindable([
      { id: 'r1', description: 'VIP high volume', values: { tier: 'VIP', amount: '>= 10000', discount: '20%', approval: 'No' } },
      { id: 'r2', description: 'VIP standard', values: { tier: 'VIP', amount: '< 10000', discount: '15%', approval: 'No' } },
      { id: 'r3', description: 'Standard high volume', values: { tier: 'Standard', amount: '>= 10000', discount: '10%', approval: 'Yes' } },
      { id: 'r4', description: 'Default fallback', values: { tier: '-', amount: '-', discount: '0%', approval: 'No' } },
    ]),
    hitPolicy = 'FIRST',
    onchange,
    class: className = '',
  }: Props = $props();

  let testInputs = $state<Record<string, string>>({
    tier: 'VIP',
    amount: '12000',
  });

  let matchedRuleId = $state<string | null>(null);

  const conditionCols = $derived(columns.filter((c) => c.type === 'condition'));
  const actionCols = $derived(columns.filter((c) => c.type === 'action'));

  function updateRuleValue(ruleId: string, colKey: string, val: string) {
    const nextRules = rules.map((r) =>
      r.id === ruleId ? { ...r, values: { ...r.values, [colKey]: val } } : r
    );
    rules = nextRules;
    onchange?.(rules);
  }

  function addRule() {
    const newRule: DecisionRule = {
      id: `rule_${Date.now()}`,
      description: 'New Rule',
      values: {},
    };
    for (const c of columns) {
      newRule.values[c.key] = '-';
    }
    rules = [...rules, newRule];
    onchange?.(rules);
  }

  function deleteRule(id: string) {
    rules = rules.filter((r) => r.id !== id);
    onchange?.(rules);
  }

  function evaluateRules() {
    for (const r of rules) {
      let isMatch = true;
      for (const cond of conditionCols) {
        const ruleVal = (r.values[cond.key] ?? '').trim();
        const testVal = (testInputs[cond.key] ?? '').trim();

        if (ruleVal === '-' || ruleVal === '') continue;

        if (ruleVal.startsWith('>=')) {
          const numR = parseFloat(ruleVal.slice(2));
          const numT = parseFloat(testVal);
          if (isNaN(numT) || numT < numR) isMatch = false;
        } else if (ruleVal.startsWith('<=')) {
          const numR = parseFloat(ruleVal.slice(2));
          const numT = parseFloat(testVal);
          if (isNaN(numT) || numT > numR) isMatch = false;
        } else if (ruleVal.startsWith('>')) {
          const numR = parseFloat(ruleVal.slice(1));
          const numT = parseFloat(testVal);
          if (isNaN(numT) || numT <= numR) isMatch = false;
        } else if (ruleVal.startsWith('<')) {
          const numR = parseFloat(ruleVal.slice(1));
          const numT = parseFloat(testVal);
          if (isNaN(numT) || numT >= numR) isMatch = false;
        } else {
          if (ruleVal.toLowerCase() !== testVal.toLowerCase()) {
            isMatch = false;
          }
        }
      }

      if (isMatch) {
        matchedRuleId = r.id;
        return;
      }
    }
    matchedRuleId = null;
  }
</script>

<div class={cn('rounded-xl border border-border bg-card p-4 shadow-xs text-xs space-y-4', className)}>
  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
    <div class="flex items-center gap-2">
      <span class="font-semibold text-foreground">{title}</span>
      <Badge variant="outline" class="font-mono text-[10px] uppercase">Hit Policy: {hitPolicy}</Badge>
    </div>

    <Button size="sm" class="h-7 text-xs gap-1" onclick={addRule}>
      <Plus class="h-3.5 w-3.5" />
      Add Rule
    </Button>
  </div>

  <!-- Decision Matrix Table -->
  <div class="overflow-x-auto rounded-lg border border-border/60">
    <table class="w-full border-collapse text-left">
      <thead>
        <!-- Top Category Header -->
        <tr class="text-[11px] font-semibold">
          <th rowspan="2" class="w-12 p-2 text-center border-r border-b border-border/60 bg-muted/80 text-muted-foreground">#</th>
          <th colspan={conditionCols.length} class="p-2 border-r border-b border-border/60 bg-primary/10 text-primary text-center font-bold">
            IF (Conditions)
          </th>
          <th colspan={actionCols.length} class="p-2 border-r border-b border-border/60 bg-success/10 text-success text-center font-bold">
            THEN (Actions)
          </th>
          <th rowspan="2" class="w-10 p-2 text-center border-b border-border/60 bg-muted/80 text-muted-foreground">Del</th>
        </tr>
        <!-- Column Names Header -->
        <tr class="bg-muted/40 text-muted-foreground border-b border-border/60 font-medium">
          {#each conditionCols as col (col.key)}
            <th class="p-2 border-r border-border/40 text-foreground">{col.label}</th>
          {/each}
          {#each actionCols as col (col.key)}
            <th class="p-2 border-r border-border/40 text-foreground">{col.label}</th>
          {/each}
        </tr>
      </thead>
      <tbody class="divide-y divide-border/40 font-mono text-xs">
        {#each rules as rule, idx (rule.id)}
          {@const isMatched = matchedRuleId === rule.id}
          <tr class={cn('hover:bg-muted/20 transition-colors', isMatched ? 'bg-success/15 font-semibold' : '')}>
            <td class="p-2 text-center border-r border-border/40 text-muted-foreground font-sans">
              {#if isMatched}
                <span class="inline-flex text-success"><CheckCircle2 class="h-3.5 w-3.5" /></span>
              {:else}
                {idx + 1}
              {/if}
            </td>
            {#each conditionCols as col (col.key)}
              <td class="p-1.5 border-r border-border/40">
                <input
                  type="text"
                  value={rule.values[col.key] ?? ''}
                  class="h-7 w-full rounded border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  oninput={(e) => updateRuleValue(rule.id, col.key, e.currentTarget.value)}
                />
              </td>
            {/each}
            {#each actionCols as col (col.key)}
              <td class="p-1.5 border-r border-border/40">
                <input
                  type="text"
                  value={rule.values[col.key] ?? ''}
                  class="h-7 w-full rounded border border-input bg-background px-2 text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  oninput={(e) => updateRuleValue(rule.id, col.key, e.currentTarget.value)}
                />
              </td>
            {/each}
            <td class="p-1.5 text-center">
              <button
                type="button"
                class="text-muted-foreground hover:text-destructive transition-colors p-1 rounded border-0 bg-transparent cursor-pointer"
                onclick={() => deleteRule(rule.id)}
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Live Rule Test Evaluator -->
  <div class="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-2">
    <div class="flex items-center justify-between">
      <span class="font-semibold text-foreground">Rule Test Runner</span>
      <Button variant="outline" size="sm" class="h-6 text-xs gap-1" onclick={evaluateRules}>
        <Play class="h-3 w-3" />
        Test Execution
      </Button>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      {#each conditionCols as cond (cond.key)}
        <div class="flex items-center gap-1.5">
          <span class="text-muted-foreground font-medium">{cond.label}:</span>
          <input
            type="text"
            bind:value={testInputs[cond.key]}
            class="h-6 w-24 rounded border border-input bg-background px-1.5 text-xs text-foreground focus-visible:outline-none"
          />
        </div>
      {/each}

      {#if matchedRuleId}
        <div class="flex items-center gap-1 text-success font-medium">
          <CheckCircle2 class="h-3.5 w-3.5" />
          <span>Fired: {rules.find((r) => r.id === matchedRuleId)?.description ?? matchedRuleId}</span>
        </div>
      {/if}
    </div>
  </div>
</div>
