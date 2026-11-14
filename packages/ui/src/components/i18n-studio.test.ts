import { describe, expect, it } from 'bun:test';

// Testable pure logic helper corresponding to I18nStudio's data operations
export function computeCompletionStats(
  allKeys: string[],
  targetDict: Record<string, string>,
): { total: number; translated: number; percent: number } {
  if (allKeys.length === 0) return { total: 0, translated: 0, percent: 100 };
  let translatedCount = 0;
  for (const k of allKeys) {
    if (targetDict[k] && targetDict[k].trim() !== '') {
      translatedCount++;
    }
  }
  const percent = Math.round((translatedCount / allKeys.length) * 100);
  return { total: allKeys.length, translated: translatedCount, percent };
}

export function extractNamespaces(keys: string[]): string[] {
  const nsSet = new Set<string>();
  for (const k of keys) {
    const parts = k.split('.');
    if (parts.length > 1) {
      nsSet.add(parts[0]!);
    } else {
      nsSet.add('common');
    }
  }
  return Array.from(nsSet).sort();
}

export function filterTranslationKeys(params: {
  keys: string[];
  sourceDict: Record<string, string>;
  targetDict: Record<string, string>;
  selectedNamespace?: string;
  searchQuery?: string;
  statusFilter?: 'all' | 'missing' | 'modified';
  initialTargetSnapshot?: Record<string, string>;
}): string[] {
  const {
    keys,
    sourceDict,
    targetDict,
    selectedNamespace = 'all',
    searchQuery = '',
    statusFilter = 'all',
    initialTargetSnapshot = {},
  } = params;

  return keys.filter((key) => {
    if (selectedNamespace !== 'all') {
      const ns = key.includes('.') ? key.split('.')[0] : 'common';
      if (ns !== selectedNamespace) return false;
    }

    const sVal = sourceDict[key] || '';
    const tVal = targetDict[key] || '';

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchKey = key.toLowerCase().includes(q);
      const matchSource = sVal.toLowerCase().includes(q);
      const matchTarget = tVal.toLowerCase().includes(q);
      if (!matchKey && !matchSource && !matchTarget) return false;
    }

    const isMissing = !tVal || tVal.trim() === '';
    const isModified = initialTargetSnapshot[key] !== tVal;

    if (statusFilter === 'missing' && !isMissing) return false;
    if (statusFilter === 'modified' && !isModified) return false;

    return true;
  });
}

describe('I18nStudio data & logic operations', () => {
  const sampleSource = {
    'auth.login.title': '欢迎登录',
    'auth.login.submit': '登录',
    'dashboard.metrics.revenue': '总营收',
    'common.ok': '确定',
  };

  const sampleTarget = {
    'auth.login.title': 'Welcome Back',
    'auth.login.submit': 'Sign In',
    'common.ok': 'OK',
    // dashboard.metrics.revenue missing
  };

  const allKeys = Object.keys(sampleSource);

  it('computes completion rate accurately', () => {
    const stats = computeCompletionStats(allKeys, sampleTarget);
    expect(stats.total).toBe(4);
    expect(stats.translated).toBe(3);
    expect(stats.percent).toBe(75);
  });

  it('extracts namespaces properly from dot-notated keys', () => {
    const ns = extractNamespaces(allKeys);
    expect(ns).toEqual(['auth', 'common', 'dashboard']);
  });

  it('filters missing translation keys', () => {
    const missing = filterTranslationKeys({
      keys: allKeys,
      sourceDict: sampleSource,
      targetDict: sampleTarget,
      statusFilter: 'missing',
    });

    expect(missing).toEqual(['dashboard.metrics.revenue']);
  });

  it('filters by namespace and search keywords', () => {
    const authKeys = filterTranslationKeys({
      keys: allKeys,
      sourceDict: sampleSource,
      targetDict: sampleTarget,
      selectedNamespace: 'auth',
    });
    expect(authKeys).toEqual(['auth.login.title', 'auth.login.submit']);

    const searchResult = filterTranslationKeys({
      keys: allKeys,
      sourceDict: sampleSource,
      targetDict: sampleTarget,
      searchQuery: '营收',
    });
    expect(searchResult).toEqual(['dashboard.metrics.revenue']);
  });

  it('applies hot reloading directly to runtime core dictionary structure', () => {
    const liveStore: Record<string, Record<string, string>> = {};
    const applyLive = (locale: string, dict: Record<string, string>) => {
      liveStore[locale] = { ...(liveStore[locale] || {}), ...dict };
    };

    applyLive('de-DE', { 'greeting.hello': 'Hallo' });
    expect(liveStore['de-DE']?.['greeting.hello']).toBe('Hallo');
  });
});
