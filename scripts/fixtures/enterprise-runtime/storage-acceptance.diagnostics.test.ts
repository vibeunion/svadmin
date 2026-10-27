import { describe, expect, it } from 'bun:test';
import {
  acceptanceTestNames,
  classifyFailure,
  failedAcceptanceTests,
  formatSafeFailureDiagnostics,
  safeFixtureLocations,
  summarizeSafeFailures,
} from './storage-acceptance.diagnostics';

const TEST_SOURCE = `
describe('acceptance', () => {
  it('fixed browser upload test', async () => {});
  it('fixed workspace test', async () => {});
});
`;
const TEST_NAMES = acceptanceTestNames(TEST_SOURCE);
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzZWNyZXQifQ.signature';
const ARBITRARY_MESSAGE = 'password=hunter2 DOM=<input value="secret"> response={"token":"secret"}';

describe('storage acceptance safe diagnostics', () => {
  it('提取源码 it 名称白名单，并只保留 Bun 固定 fail 行', () => {
    expect(TEST_NAMES).toEqual(['fixed browser upload test', 'fixed workspace test']);
    const output = [
      `(fail) fixed browser upload test [12.00ms] ${TOKEN} ${ARBITRARY_MESSAGE}`,
      `(fail) ${ARBITRARY_MESSAGE}`,
      '(pass) fixed workspace test [1.00ms]',
    ].join('\n');
    expect(failedAcceptanceTests(output, TEST_NAMES)).toEqual(['fixed browser upload test']);
  });

  it('输出丢弃 token、任意 message、DOM 与 response，只保留已知分类、fixture 行列和 engine', () => {
    const output = [
      `(fail) fixed browser upload test [12.00ms] ${TOKEN} ${ARBITRARY_MESSAGE}`,
      'Failed to resolve entry for package "@svadmin/devtools". The package may have incorrect main/module/exports specified in its package.json.',
      '    at /home/runner/work/private/scripts/fixtures/enterprise-runtime/browser/upload-browser-acceptance.ts:1858:9',
      '    at /tmp/random/scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts:920:3',
      'chromium error: net::ERR_CONNECTION_REFUSED',
    ].join('\n');

    const diagnostics = summarizeSafeFailures(output, TEST_NAMES);
    expect(diagnostics).toEqual({
      tests: ['fixed browser upload test'],
      code: 'vite-resolve-missing-devtools-dist',
      locations: ['upload-browser-acceptance.ts:1858:9', 'storage-acceptance.test.ts:920:3'],
      engines: ['chromium'],
    });

    const lines = formatSafeFailureDiagnostics(diagnostics);
    const rendered = lines.join('\n');
    expect(rendered).not.toContain(TOKEN);
    expect(rendered).not.toContain('hunter2');
    expect(rendered).not.toContain('DOM=');
    expect(rendered).not.toContain('response=');
    expect(rendered).not.toContain('/home/runner');
    expect(rendered).not.toContain('/tmp/random');
    expect(lines).toEqual([
      'Storage 验收失败诊断：test=fixed browser upload test',
      'Storage 验收失败诊断：code=vite-resolve-missing-devtools-dist',
      'Storage 验收失败诊断：location=upload-browser-acceptance.ts:1858:9',
      'Storage 验收失败诊断：location=storage-acceptance.test.ts:920:3',
      'Storage 验收失败诊断：engine=chromium',
    ]);
  });

  it('devtools-contract 缺失优先分类，未知错误不回显原文', () => {
    expect(classifyFailure(
      'Failed to resolve import "@svadmin/devtools-contract" from "packages/ui/src/devtools-bridge.ts"',
    )).toBe('vite-resolve-missing-devtools-contract-dist');
    expect(classifyFailure(`unexpected ${TOKEN} ${ARBITRARY_MESSAGE}`)).toBe('unknown-error');
    expect(safeFixtureLocations(`at /tmp/foo/scripts/fixtures/enterprise-ui/browser.spec.ts:1:2 ${ARBITRARY_MESSAGE}`))
      .toEqual(['browser.spec.ts:1:2']);
  });
});