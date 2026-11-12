<script lang="ts">
  import {
    Network,
    Plus,
    Trash2,
    Check,
    Copy,
    Code,
  } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export type RuleOperator =
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'contains'
    | 'regex';

  export interface RuleFieldOption {
    key: string;
    label: string;
    type?: ('string' | 'number' | 'boolean' | 'date') | undefined;
  }

  export interface RuleLeafNode {
    id: string;
    type: 'leaf';
    field: string;
    operator: RuleOperator;
    value: string;
  }

  export interface RuleGroupNode {
    id: string;
    type: 'group';
    combinator: 'and' | 'or';
    not?: boolean | undefined;
    children: Array<RuleGroupNode | RuleLeafNode>;
  }

  export interface RuleExpressionBuilderProps {
    fields?: RuleFieldOption[] | undefined;
    rootGroup?: RuleGroupNode | undefined;
    title?: string | undefined;
    description?: string | undefined;
    class?: string | undefined;
    onChange?: ((root: RuleGroupNode, naturalText: string) => void) | undefined;
  }

  let {
    fields = [
      { key: 'order.amount', label: '订单金额', type: 'number' },
      { key: 'user.level', label: '会员等级', type: 'string' },
      { key: 'user.riskScore', label: '风险评分', type: 'number' },
      { key: 'order.status', label: '订单状态', type: 'string' },
    ],
    rootGroup: initialRoot = {
      id: 'root',
      type: 'group',
      combinator: 'and',
      not: false,
      children: [
        { id: 'r1', type: 'leaf', field: 'order.amount', operator: 'gt', value: '5000' },
        { id: 'r2', type: 'leaf', field: 'user.level', operator: 'in', value: 'VIP, SVIP' },
      ],
    },
    title,
    description,
    class: className = '',
    onChange,
  }: RuleExpressionBuilderProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let root = $state<RuleGroupNode>(untrack(() => JSON.parse(JSON.stringify(initialRoot))));
  let isCopied = $state(false);

  function nextNodeId(): string {
    return `node-${Math.random().toString(36).slice(2, 7)}`;
  }

  function addLeaf(group: RuleGroupNode) {
    const firstField = fields[0]?.key ?? 'field';
    group.children = [
      ...group.children,
      {
        id: nextNodeId(),
        type: 'leaf',
        field: firstField,
        operator: 'eq',
        value: '',
      },
    ];
    notify();
  }

  function addSubGroup(group: RuleGroupNode) {
    const firstField = fields[0]?.key ?? 'field';
    group.children = [
      ...group.children,
      {
        id: nextNodeId(),
        type: 'group',
        combinator: 'or',
        not: false,
        children: [
          {
            id: nextNodeId(),
            type: 'leaf',
            field: firstField,
            operator: 'eq',
            value: '',
          },
        ],
      },
    ];
    notify();
  }

  function removeChild(group: RuleGroupNode, childId: string) {
    group.children = group.children.filter((c) => c.id !== childId);
    notify();
  }

  function formatNaturalLanguage(node: RuleGroupNode | RuleLeafNode): string {
    if (node.type === 'leaf') {
      const fieldDef = fields.find((f) => f.key === node.field);
      const label = fieldDef?.label ?? node.field;
      const opMap: Record<RuleOperator, string> = {
        eq: '=',
        ne: '≠',
        gt: '>',
        gte: '≥',
        lt: '<',
        lte: '≤',
        in: 'in',
        contains: '包含',
        regex: '正则匹配',
      };
      return `${label} ${opMap[node.operator]} '${node.value}'`;
    }

    const subExprs = node.children.map(formatNaturalLanguage).filter(Boolean);
    if (subExprs.length === 0) return '';
    const joiner = node.combinator === 'and' ? (chinese ? ' 且 ' : ' AND ') : (chinese ? ' 或 ' : ' OR ');
    const combined = subExprs.join(joiner);
    const wrapped = `(${combined})`;
    return node.not ? (chinese ? `非 ${wrapped}` : `NOT ${wrapped}`) : wrapped;
  }

  const naturalExpression = $derived(formatNaturalLanguage(root));

  function notify() {
    onChange?.(root, naturalExpression);
  }

  async function handleCopyAST() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(JSON.stringify(root, null, 2));
      isCopied = true;
      setTimeout(() => {
        isCopied = false;
      }, 1500);
    }
  }

  const resolvedTitle = $derived(title ?? (chinese ? '风控与业务流规则表达式设计器' : 'Rule Expression Builder'));
  const resolvedDesc = $derived(
    description ??
      (chinese
        ? '多层级复合布尔逻辑编排，支持嵌套条件组与动态 AST 编译导出'
        : 'Construct composite boolean logic trees with nested groups and AST compiler'),
  );
</script>

<div
  data-svadmin-component="RuleExpressionBuilder"
  class={cn(
    'w-full rounded-md border border-border bg-card text-card-foreground shadow-xs p-6 space-y-4',
    className,
  )}
>
  <!-- Header Bar -->
  <div class="flex items-center justify-between border-b border-border/70 pb-4">
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary border border-primary/20">
        <Network class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-base font-semibold text-foreground">{resolvedTitle}</h3>
        <p class="text-xs text-muted-foreground">{resolvedDesc}</p>
      </div>
    </div>

    <Button
      type="button"
      variant="outline"
      size="sm"
      onclick={handleCopyAST}
      class="gap-1.5 text-xs font-mono"
    >
      {#if isCopied}
        <Check class="h-3.5 w-3.5 text-success" />
        <span>{chinese ? '已复制 AST' : 'Copied AST'}</span>
      {:else}
        <Copy class="h-3.5 w-3.5" />
        <span>{chinese ? '复制 JSON AST' : 'Copy AST'}</span>
      {/if}
    </Button>
  </div>

  <!-- Natural Language Expression Preview -->
  <div class="flex items-center gap-2 rounded-md border border-border/80 bg-muted/30 px-4 py-2.5 text-xs">
    <Code class="h-4 w-4 text-primary shrink-0" />
    <span class="font-medium text-muted-foreground shrink-0">{chinese ? '表达式解析:' : 'Expression:'}</span>
    <span class="font-mono text-foreground font-semibold truncate">{naturalExpression || (chinese ? '空规则' : 'Empty rule')}</span>
  </div>

  <!-- Root Group Canvas -->
  <div class="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
    <!-- Group Header Controls -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-xs">
        <span class="font-bold text-primary">{chinese ? '满足以下' : 'Match'}</span>
        <select data-size="compact"
          bind:value={root.combinator}
          onchange={notify}
          class="svadmin-select svadmin-select--inline h-7 font-semibold"
        >
          <option value="and">{chinese ? '全部条件 (AND)' : 'ALL conditions (AND)'}</option>
          <option value="or">{chinese ? '任一条件 (OR)' : 'ANY condition (OR)'}</option>
        </select>
        <label class="inline-flex items-center gap-1 cursor-pointer select-none ml-2">
          <input type="checkbox" bind:checked={root.not} onchange={notify} />
          <span class="text-muted-foreground">{chinese ? '取反 (NOT)' : 'Invert (NOT)'}</span>
        </label>
      </div>

      <div class="flex items-center gap-1.5">
        <Button type="button" variant="outline" size="sm" class="h-7 text-xs gap-1" onclick={() => addLeaf(root)}>
          <Plus class="h-3.5 w-3.5" />
          <span>{chinese ? '添加规则' : 'Add Rule'}</span>
        </Button>
        <Button type="button" variant="outline" size="sm" class="h-7 text-xs gap-1" onclick={() => addSubGroup(root)}>
          <Plus class="h-3.5 w-3.5" />
          <span>{chinese ? '添加子组' : 'Add Group'}</span>
        </Button>
      </div>
    </div>

    <!-- Children Nodes -->
    <div class="space-y-2 pt-1 pl-3 border-l-2 border-primary/40">
      {#each root.children as child (child.id)}
        {#if child.type === 'leaf'}
          <div class="flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-xs shadow-2xs">
            <!-- Field select -->
            <select data-size="compact"
              bind:value={child.field}
              onchange={notify}
              class="svadmin-select svadmin-select--inline h-7 font-medium"
            >
              {#each fields as f (f.key)}
                <option value={f.key}>{f.label} ({f.key})</option>
              {/each}
            </select>

            <!-- Operator select -->
            <select data-size="compact"
              bind:value={child.operator}
              onchange={notify}
              class="svadmin-select svadmin-select--inline h-7 font-mono font-medium"
            >
              <option value="eq">=</option>
              <option value="ne">≠</option>
              <option value="gt">&gt;</option>
              <option value="gte">&ge;</option>
              <option value="lt">&lt;</option>
              <option value="lte">&le;</option>
              <option value="in">in</option>
              <option value="contains">contains</option>
              <option value="regex">regex</option>
            </select>

            <!-- Value input -->
            <input
              type="text"
              bind:value={child.value}
              oninput={notify}
              placeholder={chinese ? '输入比较值...' : 'Value...'}
              class="h-7 flex-1 rounded border border-input bg-background px-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />

            <!-- Remove Button -->
            <button
              type="button"
              onclick={() => removeChild(root, child.id)}
              class="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Remove rule"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        {:else}
          <!-- SubGroup Container -->
          <div class="rounded-md border border-warning/40 bg-warning/5 p-3 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="font-bold text-warning">{chinese ? '子条件组' : 'Subgroup'}</span>
                <select data-size="compact"
                  bind:value={child.combinator}
                  onchange={notify}
                  class="svadmin-select svadmin-select--inline h-6"
                >
                  <option value="and">AND</option>
                  <option value="or">OR</option>
                </select>
              </div>

              <div class="flex items-center gap-1">
                <Button type="button" variant="outline" size="sm" class="h-6 text-[11px] px-2" onclick={() => addLeaf(child)}>
                  + {chinese ? '规则' : 'Rule'}
                </Button>
                <button
                  type="button"
                  onclick={() => removeChild(root, child.id)}
                  class="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label="Remove subgroup"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div class="space-y-1.5 pl-2 border-l border-warning/40">
              {#each child.children as subChild (subChild.id)}
                {#if subChild.type === 'leaf'}
                  <div class="flex items-center gap-2 rounded border border-border bg-card p-1.5 text-xs">
                    <select data-size="compact" bind:value={subChild.field} onchange={notify} class="svadmin-select svadmin-select--inline h-6">
                      {#each fields as f (f.key)}
                        <option value={f.key}>{f.label}</option>
                      {/each}
                    </select>
                    <select data-size="compact" bind:value={subChild.operator} onchange={notify} class="svadmin-select svadmin-select--inline h-6">
                      <option value="eq">=</option>
                      <option value="gt">&gt;</option>
                      <option value="lt">&lt;</option>
                      <option value="in">in</option>
                    </select>
                    <input
                      type="text"
                      bind:value={subChild.value}
                      oninput={notify}
                      class="h-6 flex-1 text-xs bg-background border rounded px-1.5 font-mono"
                    />
                    <button
                      type="button"
                      onclick={() => removeChild(child, subChild.id)}
                      class="rounded p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remove rule"
                    >
                      <Trash2 class="h-3 w-3" />
                    </button>
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>
