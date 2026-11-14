import { SvelteMap } from 'svelte/reactivity';

export interface FeatureFlagRule {
  field: 'userId' | 'tenantId' | 'role' | string;
  operator: 'in' | 'notIn' | 'equals';
  values: string[];
}

export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  percentage?: number;
  rules?: FeatureFlagRule[];
  killSwitch?: boolean;
  tags?: string[];
  updatedAt?: string;
}

export interface FeatureFlagContext {
  userId?: string;
  tenantId?: string;
  role?: string;
  [key: string]: unknown;
}

export interface FeatureFlagRegistry {
  get(key: string): FeatureFlag | undefined;
  set(flag: FeatureFlag): void;
  register(flags: readonly FeatureFlag[]): void;
  replace(flags: readonly FeatureFlag[]): void;
  clear(): void;
}

/** 快照隔离调用方、不同 Studio 以及消费组件，写入必须经过 registry.set。 */
export function cloneFeatureFlag(flag: FeatureFlag): FeatureFlag {
  return {
    ...flag,
    ...(flag.rules ? { rules: flag.rules.map(rule => ({ ...rule, values: [...rule.values] })) } : {}),
    ...(flag.tags ? { tags: [...flag.tags] } : {}),
  };
}

/** 每个应用或 SSR 请求创建自己的注册表；不向模块级服务端状态写入数据。 */
export function createFeatureFlagRegistry(initialFlags: readonly FeatureFlag[] = []): FeatureFlagRegistry {
  const flags = new SvelteMap<string, FeatureFlag>();
  const registry: FeatureFlagRegistry = {
    get(key) {
      const flag = flags.get(key);
      return flag ? cloneFeatureFlag(flag) : undefined;
    },
    set(flag) { flags.set(flag.key, cloneFeatureFlag(flag)); },
    register(values) { for (const flag of values) registry.set(flag); },
    replace(values) {
      flags.clear();
      registry.register(values);
    },
    clear() { flags.clear(); },
  };
  registry.register(initialFlags);
  return registry;
}

let browserRegistry: FeatureFlagRegistry | undefined;
function defaultRegistry(): FeatureFlagRegistry {
  if (typeof window === 'undefined') {
    throw new Error('SSR feature flags require an explicit createFeatureFlagRegistry() instance');
  }
  return browserRegistry ??= createFeatureFlagRegistry();
}

/** FNV-1a：同一实体在不同调用中始终落入相同的 0–99 分桶。 */
export function hashStringToPercentage(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193);
  }
  return (hash >>> 0) % 100;
}

export function evaluateFeatureFlag(flag: FeatureFlag, context: FeatureFlagContext = {}): boolean {
  if (flag.killSwitch || !flag.enabled) return false;

  const rules = flag.rules ?? [];
  const matches = (rule: FeatureFlagRule) => {
    const value = context[rule.field];
    return (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      && rule.values.includes(String(value));
  };
  // 排除规则优先，不能因为白名单排在前面而绕过排除名单。
  if (rules.some(rule => rule.operator === 'notIn' && matches(rule))) return false;
  const allowRules = rules.filter(rule => rule.operator === 'in' || rule.operator === 'equals');
  if (allowRules.some(matches)) return true;

  if (flag.percentage !== undefined) {
    if (!Number.isFinite(flag.percentage) || flag.percentage <= 0) return false;
    if (flag.percentage >= 100) return true;
    const entityKey = context.userId || context.tenantId;
    // 渐进发布必须有稳定实体；缺失身份时不把所有匿名访问者一起放行。
    if (!entityKey) return false;
    return hashStringToPercentage(`${flag.key}:${entityKey}`) < flag.percentage;
  }
  return allowRules.length === 0;
}

export function registerFeatureFlags(flags: FeatureFlag[], registry: FeatureFlagRegistry = defaultRegistry()): void {
  registry.register(flags);
}
export function setFeatureFlag(flag: FeatureFlag, registry: FeatureFlagRegistry = defaultRegistry()): void {
  registry.set(flag);
}
export function getFeatureFlag(key: string, registry: FeatureFlagRegistry = defaultRegistry()): FeatureFlag | undefined {
  return registry.get(key);
}
export function clearFeatureFlags(registry: FeatureFlagRegistry = defaultRegistry()): void {
  registry.clear();
}

/** 在组件初始化时捕获注册表，在响应式表达式中读取 enabled / flag。 */
export function useFeatureFlag(
  key: string,
  contextGetter?: () => FeatureFlagContext,
  defaultFallback = false,
  registry: FeatureFlagRegistry = defaultRegistry(),
) {
  return {
    get enabled() {
      const flag = registry.get(key);
      return flag ? evaluateFeatureFlag(flag, contextGetter?.() ?? {}) : defaultFallback;
    },
    get flag() { return registry.get(key); },
  };
}
