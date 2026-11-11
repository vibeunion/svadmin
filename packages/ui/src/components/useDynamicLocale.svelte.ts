// Runtime dynamic locale override storage
const dynamicPatches = new Map<string, Map<string, string>>();

export function applyLocalePatch(locale: string, patch: Record<string, string>): void {
  let map = dynamicPatches.get(locale);
  if (!map) {
    map = new Map();
    dynamicPatches.set(locale, map);
  }
  Object.entries(patch).forEach(([k, v]) => {
    map?.set(k, v);
  });
}

export function getLocalePatch(locale: string): Record<string, string> {
  const map = dynamicPatches.get(locale);
  if (!map) return {};
  const obj: Record<string, string> = {};
  map.forEach((v, k) => {
    obj[k] = v;
  });
  return obj;
}

export function clearLocalePatches(): void {
  dynamicPatches.clear();
}

export function translateDynamic(key: string, locale = 'zh-CN', fallback?: string): string {
  const map = dynamicPatches.get(locale);
  if (map && map.has(key)) {
    return map.get(key) ?? (fallback ?? key);
  }
  return fallback ?? key;
}

export function useDynamicLocale() {
  return {
    applyPatch: applyLocalePatch,
    getPatch: getLocalePatch,
    clearPatches: clearLocalePatches,
    t: translateDynamic,
  };
}
