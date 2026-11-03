import { expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { INTENT_PRELOAD_BUDGET, preloadModule, resetIntentPreloads } from './intent-preload';

test('ssr does not call the loader', () => {
  resetIntentPreloads();
  let called = false;
  expect(preloadModule('route', async () => { called = true; }, { ssr: true })).toBeUndefined();
  expect(called).toBe(false);
});

test('client preloads once and refuses work past the inflight budget', async () => {
  resetIntentPreloads();
  let releaseFirst: () => void = () => {};
  let releaseSecond: () => void = () => {};
  const first = preloadModule('a', () => new Promise<void>((resolve) => { releaseFirst = resolve; }), { ssr: false });
  const second = preloadModule('b', () => new Promise<void>((resolve) => { releaseSecond = resolve; }), { ssr: false });
  const third = preloadModule('c', async () => 'too many', { ssr: false });
  expect(first).toBeInstanceOf(Promise);
  expect(second).toBeInstanceOf(Promise);
  expect(third).toBeUndefined();
  expect(preloadModule('a', async () => 'again', { ssr: false })).toBe(first);
  releaseFirst();
  releaseSecond();
  await first;
  await second;
});

test('intent preload and icon sprite stay inside the source budget', () => {
  const preload = resolve(import.meta.dir, 'intent-preload.ts');
  const icon = resolve(import.meta.dir, 'components/Icon.svelte');
  const preloadSource = readFileSync(preload, 'utf8');
  const iconSource = readFileSync(icon, 'utf8');
  expect(statSync(preload).size).toBeLessThanOrEqual(INTENT_PRELOAD_BUDGET.maxModuleBytes);
  expect(statSync(icon).size).toBeLessThanOrEqual(3_000);
  expect(preloadSource).toContain("addEventListener('pointerenter'");
  expect(preloadSource).toContain("addEventListener('focus'");
  expect(preloadSource).toContain('IntersectionObserver');
  expect(preloadSource).not.toContain('innerHTML');
  expect(iconSource).toContain('<use href={spriteHref} />');
  expect(iconSource).not.toContain('document.');
  expect(iconSource).not.toContain('innerHTML');
});
