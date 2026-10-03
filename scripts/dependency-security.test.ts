import { expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parseAudit, verifyPatchIntegrity } from './audit-dependencies';
import patches from './security-patches.json';

const root = resolve(import.meta.dir, '..');
const packageRoot = process.env['SVADMIN_SECURITY_PACKAGE_ROOT'] ?? root;
const require = createRequire(join(packageRoot, 'package.json'));

interface Ast { type: string; value?: string; nodes?: Ast[]; depth?: number; invalid?: boolean }
type BraceMethod = (input: string | Ast, options?: Record<string, unknown>) => unknown;
interface Braces {
  (input: string, options?: Record<string, unknown>): unknown;
  parse: BraceMethod;
  compile: BraceMethod;
  expand: BraceMethod;
  stringify: BraceMethod;
}
const braces: Braces = require('braces');
const pattern = (depth: number, open = '{', close = '}'): string =>
  open.repeat(depth) + 'x' + close.repeat(depth);
const deepAst = (depth: number): Ast => {
  let node: Ast = { type: 'text', value: 'x' };
  for (let i = 0; i < depth; i++) node = { type: 'paren', depth: 0, nodes: [node] };
  return { type: 'root', nodes: [node] };
};
const depthError = (operation: () => unknown): void => {
  expect(operation).toThrow(SyntaxError);
  expect(operation).toThrow('Brace nesting exceeds maximum depth');
};

for (const method of ['parse', 'compile', 'expand', 'stringify'] as const) {
  test(`braces ${method}: bounded brace, parenthesis and mixed nesting`, () => {
    for (const [open, close] of [['{', '}'], ['(', ')']] as const) {
      expect(() => braces[method](pattern(128, open, close))).not.toThrow();
      depthError(() => braces[method](pattern(129, open, close)));
      depthError(() => braces[method](open.repeat(129)));
      depthError(() => braces[method](pattern(4900, open, close)));
    }
    depthError(() => braces[method](pattern(65, '{(', ')}')));
  });
}
for (const method of ['compile', 'expand', 'stringify'] as const) {
  test(`braces ${method}: direct and internal AST inputs cannot bypass the depth bound`, () => {
    const internal: BraceMethod = require(`braces/lib/${method}`);
    for (const operation of [braces[method], internal]) {
      expect(() => operation(deepAst(128))).not.toThrow();
      depthError(() => operation(deepAst(129)));
      depthError(() => operation(deepAst(12000)));
    }
  });
}
test('braces preserves normal expansion, escaped literals and fallback protection', () => {
  expect(braces.expand('x/{a,b}/{1..3}')).toEqual(['x/a/1', 'x/a/2', 'x/a/3', 'x/b/1', 'x/b/2', 'x/b/3']);
  expect(braces.compile('a/{b,c}/d')).toBe('a/(b|c)/d');
  for (const input of ['\\{'.repeat(200), `"${'{'.repeat(200)}"`, `[${'{'.repeat(200)}]`]) {
    expect(() => braces(input)).not.toThrow();
  }
  const ast = deepAst(12000);
  if (ast.nodes?.[0]) ast.nodes[0].invalid = true;
  depthError(() => braces.expand(ast));
});

interface Request { url: string; method: string; headers: Record<string, string> }
interface CacheResult { response?: unknown; revalidation?: { synchronous: boolean } }
interface Policy {
  now: () => number;
  evaluateRequest: (request: Request) => CacheResult;
  satisfiesWithoutRevalidation: (request: Request) => boolean;
  useStaleWhileRevalidate: () => boolean;
  revalidatedPolicy: (request: Request, response: { status: number; headers: Record<string, string> }) => { policy: Policy };
}
interface PolicyConstructor {
  new(request: Request, response: { status: number; headers: Record<string, string> }, options: { shared: boolean }): Policy;
}
const CachePolicy: PolicyConstructor = require('http-cache-semantics');
const request = (cc = ''): Request =>
  ({ url: 'https://cache.example.test/user', method: 'GET', headers: { host: 'cache.example.test', 'cache-control': cc } });
function policy(cc: string, shared = true, extra: Record<string, string> = {}, age = 10): Policy {
  const result = new CachePolicy(request(), {
    status: 200, headers: { 'cache-control': cc, age: String(age), ...extra },
  }, { shared });
  const time = result.now();
  result.now = () => time;
  return result;
}
function blocked(result: Policy): void {
  for (const cc of ['max-stale', 'max-stale=999999', '']) {
    const evaluation = result.evaluateRequest(request(cc));
    expect(evaluation.response).toBeUndefined();
    expect(evaluation.revalidation?.synchronous).toBe(true);
    expect(result.satisfiesWithoutRevalidation(request(cc))).toBe(false);
  }
  expect(result.useStaleWhileRevalidate()).toBe(false);
  expect(result.revalidatedPolicy(request(), { status: 503, headers: {} }).policy).not.toBe(result);
}
const staleWindows = ', stale-while-revalidate=1000, stale-if-error=1000';
test('cache: security-zeroed responses cannot bypass revalidation through stale directives', () => {
  blocked(policy('max-age=0' + staleWindows, true, { 'set-cookie': 'session=private' }));
  for (const shared of [true, false]) {
    blocked(policy('no-cache, max-age=100' + staleWindows, shared));
    blocked(policy('no-store, max-age=100' + staleWindows, shared));
    blocked(policy('max-age=100' + staleWindows, shared, { vary: '*' }));
  }
  blocked(policy('private, max-age=100' + staleWindows));
});
test('cache: revalidation directives permit fresh hits but reject every stale path', () => {
  for (const cc of ['must-revalidate', 'proxy-revalidate', 's-maxage=100']) {
    const fresh = policy(`max-age=100, ${cc}${staleWindows}`);
    expect(fresh.evaluateRequest(request()).response).toBeDefined();
    blocked(policy(`max-age=100, ${cc}${staleWindows}`, true, {}, 200));
  }
  blocked(policy('max-age=0, must-revalidate' + staleWindows, false));
});
test('cache: private caches, explicit sharing and ordinary expiry keep working', () => {
  for (const result of [
    policy('max-age=0' + staleWindows),
    policy('max-age=0, proxy-revalidate' + staleWindows, false),
    policy('max-age=0' + staleWindows, false, { 'set-cookie': 'session=private' }),
    policy('max-age=0, public' + staleWindows, true, { 'set-cookie': 'session=public' }),
    policy('max-age=0, immutable' + staleWindows, true, { 'set-cookie': 'session=immutable' }),
  ]) {
    expect(result.satisfiesWithoutRevalidation(request('max-stale'))).toBe(true);
    expect(result.evaluateRequest(request()).revalidation?.synchronous).toBe(false);
    expect(result.useStaleWhileRevalidate()).toBe(true);
    expect(result.revalidatedPolicy(request(), { status: 503, headers: {} }).policy).toBe(result);
    expect(result.evaluateRequest(request('no-cache')).response).toBeUndefined();
  }
  expect(policy('max-age=0').satisfiesWithoutRevalidation(request('max-stale=9'))).toBe(false);
  expect(policy('max-age=0').satisfiesWithoutRevalidation(request('max-stale=11'))).toBe(true);
  expect(policy('max-age=0, stale-while-revalidate=10').useStaleWhileRevalidate()).toBe(false);
});

const bracePatch = patches.find(patch => patch.name === 'braces');
assert(bracePatch);
const finding = (url = bracePatch.advisory) => ({
  id: bracePatch.advisoryId, url, title: 'Test advisory', severity: 'high', vulnerable_versions: '<=3.0.3',
});
test('audit fails closed on malformed reports, network errors and unexpected exit codes', () => {
  for (const output of ['', 'not json', '[]', 'null', '{"error":"offline"}', '{"braces":[]}', '{"braces":[{}]}']) {
    expect(() => parseAudit(output, '', 1)).toThrow();
  }
  expect(() => parseAudit('{}', 'network error', 0)).toThrow();
  expect(() => parseAudit('{}', '', 1)).toThrow();
  expect(() => parseAudit('{}', '', 2)).toThrow();
  expect(() => parseAudit(JSON.stringify({ braces: [finding()] }), '', 0)).toThrow();
  expect(parseAudit('{}', '', 0)).toEqual([]);
});
test('audit only classifies the exact package and advisory pair as locally patched', () => {
  expect(parseAudit(JSON.stringify({ braces: [finding()] }), '', 1)[0]?.patched).toBe(true);
  expect(parseAudit(JSON.stringify({ braces: [finding('https://github.com/advisories/GHSA-new-advisory')] }), '', 1)[0]?.patched).toBe(false);
  expect(parseAudit(JSON.stringify({ unrelated: [finding()] }), '', 1)[0]?.patched).toBe(false);
  for (const change of [{ severity: 'critical' }, { id: 999 }, { vulnerable_versions: '<=4.0.0' }]) {
    expect(parseAudit(JSON.stringify({ braces: [{ ...finding(), ...change }] }), '', 1)[0]?.patched).toBe(false);
  }
});
test('audit verifies actual installed sources and fails on drift or unpatched nested copies', () => {
  verifyPatchIntegrity(root);
  const temp = mkdtempSync(join(tmpdir(), 'svadmin-security-'));
  try {
    for (const file of ['package.json', 'bun.lock', ...patches.map(patch => patch.patch)]) {
      mkdirSync(dirname(join(temp, file)), { recursive: true });
      cpSync(join(root, file), join(temp, file));
    }
    for (const patch of patches) {
      const directory = join('node_modules', patch.name);
      for (const file of ['package.json', ...Object.keys(patch.files)]) {
        mkdirSync(dirname(join(temp, directory, file)), { recursive: true });
        cpSync(join(root, directory, file), join(temp, directory, file));
      }
    }
    verifyPatchIntegrity(temp);
    const target = join(temp, bracePatch.patch);
    const original = readFileSync(target);
    writeFileSync(target, 'tampered patch');
    expect(() => verifyPatchIntegrity(temp)).toThrow('patch hash mismatch');
    writeFileSync(target, original);
    const lockPath = join(temp, 'bun.lock');
    const lockSource = readFileSync(lockPath, 'utf8');
    const lock = Bun.JSONC.parse(lockSource) as { packages: Record<string, unknown> };
    lock.packages['consumer/braces'] = ['braces@3.0.2'];
    writeFileSync(lockPath, JSON.stringify(lock));
    expect(() => verifyPatchIntegrity(temp)).toThrow('unexpected locked instances');
    writeFileSync(lockPath, lockSource);
    const nested = join(temp, 'node_modules/consumer');
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, 'package.json'), '{"name":"consumer"}');
    cpSync(join(temp, 'node_modules/braces'), join(nested, 'node_modules/braces'), { recursive: true });
    writeFileSync(join(nested, 'node_modules/braces/lib/parse.js'), 'unpatched');
    expect(() => verifyPatchIntegrity(temp)).toThrow('source hash mismatch');
    rmSync(nested, { recursive: true });
    const workspace = join(temp, 'packages/ui/node_modules/braces');
    cpSync(join(temp, 'node_modules/braces'), workspace, { recursive: true });
    writeFileSync(join(workspace, 'lib/parse.js'), 'unpatched workspace copy');
    expect(() => verifyPatchIntegrity(temp)).toThrow('source hash mismatch');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
