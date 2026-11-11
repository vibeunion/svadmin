<script lang="ts">
  import { untrack } from 'svelte';

  export type MaskingRuleType = 'mobile' | 'id_card' | 'bank_card' | 'email' | 'name' | 'numeric_salary' | 'custom_regex';
  export type MaskingLevel = 'L1_PUBLIC' | 'L2_INTERNAL' | 'L3_CONFIDENTIAL' | 'L4_RESTRICTED';

  export interface MaskingPolicyItem {
    id: string;
    fieldName: string;
    ruleType: MaskingRuleType;
    sensitivityLevel: MaskingLevel;
    exemptRoles: string[];
    enabled: boolean;
    description?: string | undefined;
  }

  export interface DataMaskPolicyEngineProps {
    policies?: MaskingPolicyItem[] | undefined;
    availableRoles?: { id: string; name: string }[] | undefined;
    title?: string | undefined;
    class?: string | undefined;
    onSavePolicies?: ((policies: MaskingPolicyItem[]) => void) | undefined;
    onTestRule?: ((sample: string, rule: MaskingRuleType) => string) | undefined;
  }

  const defaultPolicies: MaskingPolicyItem[] = [
    {
      id: 'p1',
      fieldName: 'mobile_phone',
      ruleType: 'mobile',
      sensitivityLevel: 'L3_CONFIDENTIAL',
      exemptRoles: ['super_admin', 'telecom_operator'],
      enabled: true,
      description: '客户手机号保留前3后4，中间4位掩码'
    },
    {
      id: 'p2',
      fieldName: 'resident_id_card',
      ruleType: 'id_card',
      sensitivityLevel: 'L4_RESTRICTED',
      exemptRoles: ['compliance_auditor'],
      enabled: true,
      description: '二代身份证保留前6后4，出生年月掩码'
    },
    {
      id: 'p3',
      fieldName: 'bank_card_number',
      ruleType: 'bank_card',
      sensitivityLevel: 'L4_RESTRICTED',
      exemptRoles: ['finance_manager'],
      enabled: true,
      description: '银行卡号仅保留首6位与尾4位'
    },
    {
      id: 'p4',
      fieldName: 'employee_salary',
      ruleType: 'numeric_salary',
      sensitivityLevel: 'L4_RESTRICTED',
      exemptRoles: ['hr_director', 'ceo'],
      enabled: true,
      description: '薪酬数值区间化掩码 (如 15,000 ~ 20,000)'
    },
    {
      id: 'p5',
      fieldName: 'corporate_email',
      ruleType: 'email',
      sensitivityLevel: 'L2_INTERNAL',
      exemptRoles: ['internal_staff'],
      enabled: false,
      description: '邮箱前缀保留首字母并用 *** 替换'
    }
  ];

  const defaultRoles = [
    { id: 'super_admin', name: '超级管理员' },
    { id: 'compliance_auditor', name: '合规风控员' },
    { id: 'finance_manager', name: '财务主管' },
    { id: 'hr_director', name: 'HR总监' },
    { id: 'telecom_operator', name: '呼叫坐席' },
    { id: 'internal_staff', name: '全员' }
  ];

  const {
    policies = defaultPolicies,
    availableRoles = defaultRoles,
    title = '企业级动态数据脱敏策略中心',
    class: className = '',
    onSavePolicies = undefined,
    onTestRule = undefined
  }: DataMaskPolicyEngineProps = $props();

  let policyList = $state<MaskingPolicyItem[]>(untrack(() => [...policies]));
  let testSample = $state('13800138000');
  let testRuleType = $state<MaskingRuleType>('mobile');

  function applyMask(sample: string, rule: MaskingRuleType): string {
    if (onTestRule) {
      return onTestRule(sample, rule);
    }
    const clean = sample.trim();
    if (!clean) return '—';

    switch (rule) {
      case 'mobile':
        return clean.length >= 7 ? clean.replace(/(\d{3})\d{4}(\d+)/, '$1****$2') : '***';
      case 'id_card':
        return clean.length >= 10 ? clean.replace(/(\d{6})\d+(\d{4})/, '$1********$2') : '******';
      case 'bank_card':
        return clean.length >= 10 ? clean.replace(/(\d{6})\d+(\d{4})/, '$1******$2') : '******';
      case 'email':
        return clean.replace(/^([^@]{1,2})[^@]*(@.*)$/, '$1***$2');
      case 'name':
        return clean.length <= 2 ? clean.substring(0, 1) + '*' : clean.substring(0, 1) + '*'.repeat(clean.length - 2) + clean.slice(-1);
      case 'numeric_salary':
        return '¥ ***,***.00 (受限密级)';
      case 'custom_regex':
        return clean.replace(/./g, '*');
      default:
        return '***';
    }
  }

  const testResult = $derived(applyMask(testSample, testRuleType));

  function togglePolicy(id: string) {
    policyList = policyList.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p);
    onSavePolicies?.(policyList);
  }

  function getLevelBadge(level: MaskingLevel): { label: string; class: string } {
    switch (level) {
      case 'L4_RESTRICTED':
        return { label: 'L4 极高敏感', class: 'bg-destructive/10 text-destructive border-destructive/20' };
      case 'L3_CONFIDENTIAL':
        return { label: 'L3 机密核心', class: 'bg-warning/10 text-warning border-warning/20' };
      case 'L2_INTERNAL':
        return { label: 'L2 内部受限', class: 'bg-info/10 text-info border-info/20' };
      default:
        return { label: 'L1 公开业务', class: 'bg-muted text-muted-foreground border-border' };
    }
  }

  function getRuleLabel(type: MaskingRuleType): string {
    switch (type) {
      case 'mobile': return '手机号脱敏';
      case 'id_card': return '二代居民身份证';
      case 'bank_card': return '银行借记/贷记卡';
      case 'email': return '电子邮箱前缀';
      case 'name': return '客户真实姓名';
      case 'numeric_salary': return '薪酬与财务金额';
      case 'custom_regex': return '自定义正则规则';
    }
  }
</script>

<div
  class="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm {className}"
  data-svadmin-component="DataMaskPolicyEngine"
>
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
    <div class="flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-medium text-foreground">{title}</h3>
        <p class="text-xs text-muted-foreground">基于角色与密级全局集中下发，支持免脱敏白名单与实时沙箱</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        onclick={() => onSavePolicies?.(policyList)}
      >
        <svg class="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        保存策略基线
      </button>
    </div>
  </div>

  <div class="overflow-x-auto rounded-md border border-border">
    <table class="w-full border-collapse text-left text-xs">
      <thead>
        <tr class="border-b border-border bg-muted/50 font-medium text-muted-foreground">
          <th class="p-2.5">字段标识 (Field)</th>
          <th class="p-2.5">脱敏算法类型</th>
          <th class="p-2.5">安全密级</th>
          <th class="p-2.5">免脱敏豁免角色</th>
          <th class="p-2.5">说明备注</th>
          <th class="p-2.5 text-center w-20">策略启用</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#each policyList as policy (policy.id)}
          {@const lvl = getLevelBadge(policy.sensitivityLevel)}
          <tr class="hover:bg-muted/30 transition-colors {policy.enabled ? '' : 'opacity-60 bg-muted/10'}">
            <td class="p-2.5 font-mono font-medium text-foreground">
              {policy.fieldName}
            </td>
            <td class="p-2.5">
              <span class="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">
                {getRuleLabel(policy.ruleType)}
              </span>
            </td>
            <td class="p-2.5">
              <span class="inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold {lvl.class}">
                {lvl.label}
              </span>
            </td>
            <td class="p-2.5">
              <div class="flex flex-wrap gap-1">
                {#each policy.exemptRoles as roleId}
                  {@const roleObj = availableRoles.find(r => r.id === roleId)}
                  <span class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {roleObj?.name ?? roleId}
                  </span>
                {/each}
              </div>
            </td>
            <td class="p-2.5 text-muted-foreground max-w-[200px] truncate">
              {policy.description ?? '—'}
            </td>
            <td class="p-2.5 text-center">
              <input
                type="checkbox"
                checked={policy.enabled}
                onchange={() => togglePolicy(policy.id)}
                class="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
              />
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="rounded-md border border-border bg-muted/20 p-3 flex flex-col gap-2.5">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <svg class="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        实时脱敏算法沙箱验证
      </span>
      <span class="text-[10px] text-muted-foreground">客户端零网络开销即时推演</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
      <div>
        <label for="mask-sample-input" class="text-[11px] text-muted-foreground block mb-1">测试明文数据样本:</label>
        <input
          id="mask-sample-input"
          type="text"
          bind:value={testSample}
          class="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <label for="mask-rule-select" class="text-[11px] text-muted-foreground block mb-1">选择校验脱敏策略:</label>
        <select
          id="mask-rule-select"
          bind:value={testRuleType}
          class="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="mobile">手机号 (保留首3尾4)</option>
          <option value="id_card">居民身份证 (保留首6尾4)</option>
          <option value="bank_card">银行卡号 (保留首6尾4)</option>
          <option value="email">电子邮箱 (前缀掩码)</option>
          <option value="name">姓名 (中段掩码)</option>
          <option value="numeric_salary">薪酬数值 (区间密级)</option>
        </select>
      </div>

      <div>
        <span class="text-[11px] text-muted-foreground block mb-1">脱敏后安全输出:</span>
        <div class="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-mono font-medium text-primary">
          <span>{testResult}</span>
          <span class="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
            安全掩码
          </span>
        </div>
      </div>
    </div>
  </div>
</div>
