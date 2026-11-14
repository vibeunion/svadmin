/**
 * Enterprise Feature Flag & Gray Release Evaluation Engine
 */

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
  percentage?: number; // 0 - 100
  rules?: FeatureFlagRule[];
  killSwitch?: boolean; // Emergency kill switch overrides all
  tags?: string[];
  updatedAt?: string;
}

export interface FeatureFlagContext {
  userId?: string;
  tenantId?: string;
  role?: string;
  [key: string]: unknown;
}

// In-memory feature flag registry
const flagRegistry = new Map<string, FeatureFlag>();

/**
 * Deterministic string hash to percentage (0 - 99)
 */
export function hashStringToPercentage(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * Evaluate a single feature flag against the given context
 */
export function evaluateFeatureFlag(
  flag: FeatureFlag,
  context: FeatureFlagContext = {}
): boolean {
  // 1. Emergency Kill Switch always takes highest precedence
  if (flag.killSwitch) {
    return false;
  }

  // 2. If globally disabled and no whitelist rules override
  if (!flag.enabled) {
    return false;
  }

  // 3. Evaluate whitelist / rule matching if present
  if (flag.rules && flag.rules.length > 0) {
    for (const rule of flag.rules) {
      const contextVal = context[rule.field];
      if (contextVal === undefined || contextVal === null) continue;
      const strVal = String(contextVal);

      if (rule.operator === 'in' && rule.values.includes(strVal)) {
        return true;
      }
      if (rule.operator === 'equals' && rule.values.includes(strVal)) {
        return true;
      }
      if (rule.operator === 'notIn' && rule.values.includes(strVal)) {
        return false;
      }
    }
  }

  // 4. Percentage rollout evaluation
  if (typeof flag.percentage === 'number') {
    if (flag.percentage <= 0) return false;
    if (flag.percentage >= 100) return true;

    // Use userId or tenantId as deterministic rollout key
    const entityKey = context.userId || context.tenantId || '';
    if (entityKey) {
      const bucket = hashStringToPercentage(`${flag.key}:${entityKey}`);
      return bucket < flag.percentage;
    }
    // If no entity key provided in context, default to percentage threshold against flag key
    return hashStringToPercentage(flag.key) < flag.percentage;
  }

  return flag.enabled;
}

/**
 * Register initial feature flags into global registry
 */
export function registerFeatureFlags(flags: FeatureFlag[]): void {
  for (const flag of flags) {
    flagRegistry.set(flag.key, flag);
  }
}

/**
 * Set or update a feature flag
 */
export function setFeatureFlag(flag: FeatureFlag): void {
  flagRegistry.set(flag.key, flag);
}

/**
 * Get a registered feature flag by key
 */
export function getFeatureFlag(key: string): FeatureFlag | undefined {
  return flagRegistry.get(key);
}

/**
 * Clear all registered feature flags
 */
export function clearFeatureFlags(): void {
  flagRegistry.clear();
}

/**
 * Reactive Svelte 5 rune hook for feature flag consumption in UI
 */
export function useFeatureFlag(
  key: string,
  contextGetter?: () => FeatureFlagContext,
  defaultFallback = false
) {
  let isEnabled = $state<boolean>(() => {
    const flag = flagRegistry.get(key);
    if (!flag) return defaultFallback;
    const ctx = contextGetter ? contextGetter() : {};
    return evaluateFeatureFlag(flag, ctx);
  });

  return {
    get enabled() {
      const flag = flagRegistry.get(key);
      if (!flag) return defaultFallback;
      const ctx = contextGetter ? contextGetter() : {};
      return evaluateFeatureFlag(flag, ctx);
    },
    get flag() {
      return flagRegistry.get(key);
    },
  };
}
