import { basename } from 'node:path';

export const KNOWN_FAILURE_CODES = [
  'vite-resolve-missing-devtools-contract-dist',
  'vite-resolve-missing-devtools-dist',
  'vite-resolve-failed',
  'vite-transform-failed',
  'browser-launch-failed',
  'browser-timeout',
  'network-failed',
  'assertion-failed',
  'runtime-type-error',
  'unknown-error',
] as const;

export type KnownFailureCode = typeof KNOWN_FAILURE_CODES[number];
export type BrowserEngineName = 'chromium' | 'firefox' | 'webkit';

const BROWSER_ENGINES: readonly BrowserEngineName[] = ['chromium', 'firefox', 'webkit'];
const MAX_SAFE_LOCATIONS = 5;
// 只接受验收真正会运行的 fixture 源码；日志里其它 basename（含伪造路径）一律丢弃。
const SAFE_FIXTURE_SOURCES: ReadonlySet<string> = new Set([
  'enterprise-runtime/storage-acceptance.test.ts',
  'enterprise-runtime/browser/upload-browser-acceptance.ts',
]);

interface FailureRule {
  code: KnownFailureCode;
  pattern: RegExp;
}

// 只根据固定 token 分类；匹配失败时落到 unknown-error，不输出原始 message。
const FAILURE_RULES: readonly FailureRule[] = [
  {
    code: 'vite-resolve-missing-devtools-contract-dist',
    pattern: /(?:Failed to resolve|Cannot find module|ERR_MODULE_NOT_FOUND)[\s\S]{0,240}@svadmin\/devtools-contract/,
  },
  {
    code: 'vite-resolve-missing-devtools-dist',
    pattern: /(?:Failed to resolve|Cannot find module|ERR_MODULE_NOT_FOUND)[\s\S]{0,240}@svadmin\/devtools(?!-contract)/,
  },
  {
    code: 'vite-resolve-failed',
    pattern: /(?:Failed to resolve entry for package|Failed to resolve import|Could not resolve entry module)/,
  },
  {
    code: 'vite-transform-failed',
    pattern: /(?:Pre-transform error|Transform failed|ParseError|Unexpected token)/,
  },
  {
    code: 'browser-launch-failed',
    pattern: /(?:browserType\.launch|Executable doesn't exist|playwright install|Target page, context or browser has been closed)/,
  },
  {
    code: 'browser-timeout',
    pattern: /(?:Test timed out|Timed out waiting|Timeout \d+ms exceeded|page\.waitFor.*Timeout)/,
  },
  {
    code: 'network-failed',
    pattern: /(?:net::ERR_|ECONNREFUSED|ECONNRESET|ENOTFOUND|fetch failed|socket hang up)/,
  },
  {
    code: 'assertion-failed',
    pattern: /(?:AssertionError|expect\([^)]*\)\.(?:not\.)?to[A-Za-z]+|toBe(?:Greater|Less|Truthy|Falsy)?\(|toEqual\()/,
  },
  {
    code: 'runtime-type-error',
    pattern: /(?:TypeError:|ReferenceError:|is not a function|Cannot read propert)/,
  },
];

export interface SafeFailureDiagnostics {
  tests: string[];
  code: KnownFailureCode;
  locations: string[];
  engines: BrowserEngineName[];
}

// Bun 的 it(...) 名称来自受控 fixture 源码；只提取单引号形式，避免误收任意日志文本。
export function acceptanceTestNames(source: string): string[] {
  const names: string[] = [];
  for (const match of source.matchAll(/\bit\(\s*'([^'\n]+)'/g)) {
    const name = match[1];
    if (name !== undefined && !names.includes(name)) names.push(name);
  }
  return names;
}

export function classifyFailure(output: string): KnownFailureCode {
  for (const rule of FAILURE_RULES) {
    if (rule.pattern.test(output)) return rule.code;
  }
  return 'unknown-error';
}

export function failedAcceptanceTests(output: string, testNames: readonly string[]): string[] {
  const failed: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    if (!line.includes('(fail)')) continue;
    for (const name of testNames) {
      if (line.includes(name) && !failed.includes(name)) failed.push(name);
    }
  }
  return failed;
}

// 仅保留已知 fixture 源码 basename + 行列；绝对路径和 benchmark 临时路径都不输出。
export function safeFixtureLocations(output: string): string[] {
  const locations: string[] = [];
  const pattern = /scripts\/fixtures\/(enterprise-(?:runtime|ui)\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.(?:ts|tsx|js|svelte)):(\d+):(\d+)/g;
  for (const match of output.matchAll(pattern)) {
    const relativePath = match[1];
    const line = match[2];
    const column = match[3];
    if (relativePath === undefined || line === undefined || column === undefined) continue;
    if (!SAFE_FIXTURE_SOURCES.has(relativePath)) continue;
    const location = `${basename(relativePath)}:${line}:${column}`;
    if (!locations.includes(location)) locations.push(location);
    if (locations.length === MAX_SAFE_LOCATIONS) break;
  }
  return locations;
}

export function detectedBrowserEngines(output: string): BrowserEngineName[] {
  const engines: BrowserEngineName[] = [];
  for (const engine of BROWSER_ENGINES) {
    if (new RegExp(`\\b${engine}\\b`).test(output)) engines.push(engine);
  }
  return engines;
}

export function summarizeSafeFailures(output: string, testNames: readonly string[]): SafeFailureDiagnostics {
  return {
    tests: failedAcceptanceTests(output, testNames),
    code: classifyFailure(output),
    locations: safeFixtureLocations(output),
    engines: detectedBrowserEngines(output),
  };
}

// 输出行只含白名单字段；调用方不得回退到原始 output。
export function formatSafeFailureDiagnostics(diagnostics: SafeFailureDiagnostics): string[] {
  const lines = diagnostics.tests.map(test => `Storage 验收失败诊断：test=${test}`);
  lines.push(`Storage 验收失败诊断：code=${diagnostics.code}`);
  for (const location of diagnostics.locations) {
    lines.push(`Storage 验收失败诊断：location=${location}`);
  }
  for (const engine of diagnostics.engines) {
    lines.push(`Storage 验收失败诊断：engine=${engine}`);
  }
  return lines;
}