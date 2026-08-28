<script lang="ts">
  export interface DecisionColumn {
    key: string;
    label: string;
    type: 'condition' | 'action';
  }

  export interface DecisionRule {
    id: string;
    description?: string;
    values: Record<string, string>;
  }

  interface Props {
    title?: string;
    columns?: DecisionColumn[];
    rules?: DecisionRule[];
    hitPolicy?: string;
    formAction?: string;
    class?: string;
  }

  let {
    title = 'Decision Table Matrix',
    columns = [
      { key: 'tier', label: 'Tier', type: 'condition' },
      { key: 'discount', label: 'Discount', type: 'action' },
    ],
    rules = [
      { id: 'r1', description: 'VIP', values: { tier: 'VIP', discount: '20%' } },
      { id: 'r2', description: 'Standard', values: { tier: 'Standard', discount: '10%' } },
    ],
    hitPolicy = 'FIRST',
    formAction = '',
    class: className = '',
  }: Props = $props();

  const conditionCols = $derived(columns.filter((c) => c.type === 'condition'));
  const actionCols = $derived(columns.filter((c) => c.type === 'action'));
</script>

<div class="sv-lite-decision-container {className}">
  <div class="sv-lite-decision-header">
    <strong>{title}</strong>
    <span class="sv-lite-hit-policy">[Policy: {hitPolicy}]</span>
  </div>

  <form method="POST" action={formAction}>
    <table class="sv-lite-decision-table">
      <thead>
        <tr>
          <th rowspan="2" class="sv-lite-th-idx">#</th>
          <th colspan={conditionCols.length} class="sv-lite-th-cond">Conditions (IF)</th>
          <th colspan={actionCols.length} class="sv-lite-th-act">Actions (THEN)</th>
        </tr>
        <tr>
          {#each conditionCols as col (col.key)}
            <th class="sv-lite-th-sub">{col.label}</th>
          {/each}
          {#each actionCols as col (col.key)}
            <th class="sv-lite-th-sub">{col.label}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rules as rule, idx (rule.id)}
          <tr>
            <td class="sv-lite-td-idx">{idx + 1}</td>
            {#each conditionCols as col (col.key)}
              <td>
                <input
                  type="text"
                  name={`rule_${rule.id}_${col.key}`}
                  value={rule.values[col.key] ?? ''}
                  class="sv-lite-rule-input"
                />
              </td>
            {/each}
            {#each actionCols as col (col.key)}
              <td>
                <input
                  type="text"
                  name={`rule_${rule.id}_${col.key}`}
                  value={rule.values[col.key] ?? ''}
                  class="sv-lite-rule-input sv-lite-act-input"
                />
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>

    {#if formAction}
      <div class="sv-lite-decision-actions">
        <button type="submit" class="sv-lite-save-btn">Save Rules</button>
      </div>
    {/if}
  </form>
</div>

<style>
  .sv-lite-decision-container {
    display: block;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px;
    background-color: #ffffff;
    font-size: 12px;
    overflow-x: auto;
  }
  .sv-lite-decision-header {
    margin-bottom: 10px;
    font-size: 13px;
    color: #0f172a;
  }
  .sv-lite-hit-policy {
    font-size: 10px;
    color: #64748b;
    margin-left: 6px;
  }
  .sv-lite-decision-table {
    width: 100%;
    border-collapse: collapse;
    font-family: monospace;
  }
  .sv-lite-decision-table th, .sv-lite-decision-table td {
    border: 1px solid #cbd5e1;
    padding: 4px 6px;
  }
  .sv-lite-th-idx, .sv-lite-td-idx {
    background-color: #f1f5f9;
    text-align: center;
    width: 28px;
    font-size: 10px;
  }
  .sv-lite-th-cond {
    background-color: #e0e7ff;
    color: #3730a3;
    text-align: center;
    font-weight: bold;
  }
  .sv-lite-th-act {
    background-color: #dcfce7;
    color: #166534;
    text-align: center;
    font-weight: bold;
  }
  .sv-lite-th-sub {
    background-color: #f8fafc;
    color: #475569;
    font-weight: 600;
  }
  .sv-lite-rule-input {
    width: 100%;
    border: 1px solid #cbd5e1;
    padding: 3px;
    font-size: 11px;
    box-sizing: border-box;
  }
  .sv-lite-act-input {
    font-weight: bold;
    color: #4338ca;
  }
  .sv-lite-decision-actions {
    margin-top: 10px;
    text-align: right;
  }
  .sv-lite-save-btn {
    padding: 5px 12px;
    background-color: #4f46e5;
    color: #ffffff;
    border: none;
    border-radius: 3px;
    font-size: 11px;
    cursor: pointer;
  }
</style>
