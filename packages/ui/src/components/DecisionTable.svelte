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

<div class={cn('svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-cef5b893cf23 svadmin-u-359090c2d529 svadmin-u-3e7ce58d64fa', className)}>
  <!-- Header -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      <span class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{title}</span>
      <Badge variant="outline" class="svadmin-u-0e65706bcccd svadmin-u-1dc571a3609f uppercase">Hit Policy: {hitPolicy}</Badge>
    </div>

    <Button size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={addRule}>
      <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      Add Rule
    </Button>
  </div>

  <!-- Decision Matrix Table -->
  <div class="svadmin-u-1384f66f41d0 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff">
    <table class="svadmin-u-6da6a3c3f741 svadmin-u-4583f90cd9bd svadmin-u-2eba0d65d059">
      <thead>
        <!-- Top Category Header -->
        <tr class="svadmin-u-d058ca6de60f svadmin-u-e83a7042bc91">
          <th rowspan="2" class="svadmin-u-e7e371071bc5 svadmin-u-7660b450905a svadmin-u-ca6bf63030aa svadmin-u-5ceb636bd9f3 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-85d919893645 svadmin-u-bfa603190748">#</th>
          <th colspan={conditionCols.length} class="svadmin-u-7660b450905a svadmin-u-5ceb636bd9f3 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-ca6bf63030aa svadmin-u-69450ef1487e">
            IF (Conditions)
          </th>
          <th colspan={actionCols.length} class="svadmin-u-7660b450905a svadmin-u-5ceb636bd9f3 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff svadmin-u-ca6bf63030aa svadmin-u-69450ef1487e">
            THEN (Actions)
          </th>
          <th rowspan="2" class="svadmin-u-d854e5698b57 svadmin-u-7660b450905a svadmin-u-ca6bf63030aa svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-85d919893645 svadmin-u-bfa603190748">Del</th>
        </tr>
        <!-- Column Names Header -->
        <tr class="svadmin-u-b00f43c30c2b svadmin-u-bfa603190748 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-2689f3958069">
          {#each conditionCols as col (col.key)}
            <th class="svadmin-u-7660b450905a svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-d4108abe6359">{col.label}</th>
          {/each}
          {#each actionCols as col (col.key)}
            <th class="svadmin-u-7660b450905a svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-d4108abe6359">{col.label}</th>
          {/each}
        </tr>
      </thead>
      <tbody class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258 svadmin-u-0e65706bcccd svadmin-u-359090c2d529">
        {#each rules as rule, idx (rule.id)}
          {@const isMatched = matchedRuleId === rule.id}
          <tr class={cn('svadmin-u-c4b5eaba40e3 svadmin-u-ceb69a6b0e5f', isMatched ? 'svadmin-u-4cf5af8d25d3 svadmin-u-e83a7042bc91' : '')}>
            <td class="svadmin-u-7660b450905a svadmin-u-ca6bf63030aa svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-bfa603190748 svadmin-u-79bf1259388b">
              {#if isMatched}
                <span class="svadmin-u-52083e7da442 svadmin-u-76747e5e02ff"><CheckCircle2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" /></span>
              {:else}
                {idx + 1}
              {/if}
            </td>
            {#each conditionCols as col (col.key)}
              <td class="svadmin-u-cd009d7d208c svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d">
                <input
                  type="text"
                  value={rule.values[col.key] ?? ''}
                  class="svadmin-u-d0a52b312f7d svadmin-u-6da6a3c3f741 svadmin-u-07389a777c1f svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-d4108abe6359 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
                  oninput={(e) => updateRuleValue(rule.id, col.key, e.currentTarget.value)}
                />
              </td>
            {/each}
            {#each actionCols as col (col.key)}
              <td class="svadmin-u-cd009d7d208c svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d">
                <input
                  type="text"
                  value={rule.values[col.key] ?? ''}
                  class="svadmin-u-d0a52b312f7d svadmin-u-6da6a3c3f741 svadmin-u-07389a777c1f svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-e83a7042bc91 svadmin-u-20aaf08a7ed1 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
                  oninput={(e) => updateRuleValue(rule.id, col.key, e.currentTarget.value)}
                />
              </td>
            {/each}
            <td class="svadmin-u-cd009d7d208c svadmin-u-ca6bf63030aa">
              <button
                type="button"
                class="svadmin-u-bfa603190748 svadmin-u-51e95020d6f2 svadmin-u-ceb69a6b0e5f svadmin-u-eb6a3cef9686 svadmin-u-07389a777c1f svadmin-u-119b2aa0b8f6 svadmin-u-7f19cdf4c5bb svadmin-u-34516836730d"
                onclick={() => deleteRule(rule.id)}
              >
                <Trash2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Live Rule Test Evaluator -->
  <div class="svadmin-u-eb6e8b881acd svadmin-u-5f22e64f2282 svadmin-u-2859c861d7de svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-6f7e013d6499">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc">
      <span class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">Rule Test Runner</span>
      <Button variant="outline" size="sm" class="svadmin-u-f6fe902450dc svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={evaluateRules}>
        <Play class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        Test Execution
      </Button>
    </div>

    <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c">
      {#each conditionCols as cond (cond.key)}
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
          <span class="svadmin-u-bfa603190748 svadmin-u-2689f3958069">{cond.label}:</span>
          <input
            type="text"
            bind:value={testInputs[cond.key]}
            class="svadmin-u-f6fe902450dc svadmin-u-69da7e4ff95d svadmin-u-07389a777c1f svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-45d828117213 svadmin-u-359090c2d529 svadmin-u-d4108abe6359 svadmin-u-f10f771f87e9"
          />
        </div>
      {/each}

      {#if matchedRuleId}
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-76747e5e02ff svadmin-u-2689f3958069">
          <CheckCircle2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          <span>Fired: {rules.find((r) => r.id === matchedRuleId)?.description ?? matchedRuleId}</span>
        </div>
      {/if}
    </div>
  </div>
</div>
