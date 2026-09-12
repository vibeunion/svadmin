import { afterEach, describe, expect, it, vi } from 'vitest';
import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createFeatureGate, canAccessAsync, setAccessControlProvider, resetAccessControlProvider,
} from './permissions.svelte';
import { parseFeatureGateUser, snapshotFeatureGateConfig } from './feature-gate-contract';
import { snapshotPlainData } from './plain-data';

afterEach(() => { resetAccessControlProvider(); vi.restoreAllMocks(); });

function createRaw(value: unknown): unknown {
  return Reflect.apply(createFeatureGate, undefined, [value]);
}

function evaluate(gate: ReturnType<typeof createFeatureGate>, value: unknown): unknown {
  return Reflect.apply(gate, undefined, [value]);
}

describe('createFeatureGate', () => {
  it('strictly compiles the contract and rejects invalid public type usage', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const roots = ['permissions.svelte.ts', 'feature-gate-contract.ts', 'plain-data.ts',
      'permissions.feature-gate.test.svelte.ts'].map(name => resolve(directory, name));
    const virtualPath = resolve(directory, 'feature-gate.test.virtual.ts');
    const valid = [
      "import { createFeatureGate, type FeatureGateConfig, type FeatureGateUser } from './index';",
      'const hierarchy: readonly string[] = ["admin", "editor", "viewer"];',
      'const config: FeatureGateConfig = { minRole: "editor", roleHierarchy: hierarchy, permissions: ["posts:edit"] };',
      'const gate: (user: FeatureGateUser) => boolean = createFeatureGate(config);',
      'const subject: FeatureGateUser = { role: "editor", permissions: ["posts:edit"] };',
      'const visible: boolean = gate(subject);',
      'const literal = createFeatureGate({ roles: ["reader"] as const, permissions: ["read"] as const });',
      'const open: boolean = createFeatureGate({})({ role: "guest", permissions: [] });',
    ];
    const invalid = [
      'createFeatureGate({ minRole: "editor" });',
      'createFeatureGate({ roleHierarchy: hierarchy });',
      'createFeatureGate({ roles: "admin" });',
      'createFeatureGate({ permissions: [true] });',
      'createFeatureGate({ roles: undefined });',
      'createFeatureGate({ minRole: "editor", roleHierarchy: undefined });',
      'createFeatureGate({ enabled: true });',
      'gate({ role: "admin" });',
      'gate({ role: 1, permissions: [] });',
      'gate({ role: "admin", permissions: "*" });',
      'gate({ role: "admin", permissions: [], token: "extra" });',
      'config.minRole = "viewer";',
      'config.roleHierarchy.push("owner");',
      'subject.role = "admin";',
      'subject.permissions.push("*");',
      'const text: string = gate(subject);',
    ];
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false,
      types: ['svelte', 'node'], target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = path => path === virtualPath ? [...valid, ...invalid].join('\n') : read(path);
    host.fileExists = path => path === virtualPath || exists(path);
    const program = ts.createProgram({ rootNames: [...roots, virtualPath], options, host });
    const diagnostics = (path: string) => {
      const source = program.getSourceFile(path);
      if (!source) throw new Error(`Missing source ${path}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    };
    expect(roots.flatMap(diagnostics).map(item =>
      `${item.file?.fileName}:${item.start}: ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`)).toEqual([]);
    expect(diagnostics(virtualPath).map(item => item.file && item.start !== undefined
      ? item.file.getLineAndCharacterOfPosition(item.start).line : -1)).toEqual(invalid.map((_, index) => valid.length + index));
  }, 30_000);

  it('requires exact permissions', () => {
    const canEditPosts = createFeatureGate({
      permissions: ['posts:edit'],
    });

    expect(canEditPosts({ role: 'admin', permissions: ['posts:edit'] })).toBe(true);
    expect(canEditPosts({ role: 'admin', permissions: ['posts:*'] })).toBe(false);
    expect(canEditPosts({ role: 'admin', permissions: ['*'] })).toBe(false);
  });

  it('enforces role hierarchy when provided', () => {
    const canModerate = createFeatureGate({
      minRole: 'editor',
      roleHierarchy: ['admin', 'editor', 'viewer'],
    });

    expect(canModerate({ role: 'admin', permissions: [] })).toBe(true);
    expect(canModerate({ role: 'editor', permissions: [] })).toBe(true);
    expect(canModerate({ role: 'viewer', permissions: [] })).toBe(false);
  });

  it.each([
    null, undefined, false, [], { enabled: true }, { roles: 'admin' }, { roles: [1] },
    { roles: [''] }, { permissions: [' \t'] }, { permissions: undefined }, { minRole: 'editor' },
    { roleHierarchy: ['admin'] }, { minRole: 'editor', roleHierarchy: [] },
    { minRole: 'editor', roleHierarchy: ['admin', 'viewer'] },
    { minRole: 'editor', roleHierarchy: ['admin', 'editor', 'editor'] },
    { minRole: '', roleHierarchy: [''] }, { minRole: 'admin', roleHierarchy: ['admin', 1] },
  ])('rejects invalid configuration %j', value => {
    expect(() => createRaw(value)).toThrowError(expect.objectContaining({
      code: 'INVALID_FEATURE_GATE_CONFIG', statusCode: 422, message: 'Invalid feature gate configuration',
    }));
  });

  it.each([
    null, undefined, false, 0, 'admin', [], {}, { role: 'admin' }, { permissions: [] },
    { role: '', permissions: [] }, { role: ' \t', permissions: [] },
    { role: 'admin', permissions: '*' }, { role: 'admin', permissions: [true] },
    { role: 'admin', permissions: [''] }, { role: 'admin', permissions: [], extra: true },
  ])('denies malformed user hints %j even for an otherwise unconstrained gate', value => {
    expect(evaluate(createFeatureGate({}), value)).toBe(false);
  });

  it('requires all configured role, hierarchy and permission constraints', () => {
    const gate = createFeatureGate({
      roles: ['editor'], minRole: 'editor', roleHierarchy: ['admin', 'editor', 'viewer'],
      permissions: ['posts:read', 'posts:edit'],
    });
    expect(gate({ role: 'editor', permissions: ['posts:read', 'posts:edit'] })).toBe(true);
    expect(gate({ role: 'admin', permissions: ['posts:read', 'posts:edit'] })).toBe(false);
    expect(gate({ role: 'viewer', permissions: ['posts:read', 'posts:edit'] })).toBe(false);
    expect(gate({ role: 'editor', permissions: ['posts:read'] })).toBe(false);
    expect(gate({ role: 'editor', permissions: ['posts:edit'] })).toBe(false);
  });

  it('uses caller-defined exact roles without built-in privilege or case normalization', () => {
    const gate = createFeatureGate({ minRole: 'writer', roleHierarchy: ['owner', 'writer', 'reader'] });
    expect(gate({ role: 'owner', permissions: [] })).toBe(true);
    expect(gate({ role: 'writer', permissions: [] })).toBe(true);
    expect(gate({ role: 'reader', permissions: [] })).toBe(false);
    expect(gate({ role: 'admin', permissions: ['*'] })).toBe(false);
    expect(gate({ role: 'Writer', permissions: [] })).toBe(false);
  });

  it('preserves empty constraint semantics for valid hints', () => {
    const user = { role: 'guest', permissions: [] };
    expect(createFeatureGate({})(user)).toBe(true);
    expect(createFeatureGate({ permissions: [] })(user)).toBe(true);
    expect(createFeatureGate({ roles: [] })(user)).toBe(false);
    expect(createFeatureGate({ permissions: ['read', 'read'] })({ role: 'guest', permissions: ['read'] })).toBe(true);
  });

  it('treats an explicitly requested wildcard string as an exact permission value', () => {
    const gate = createFeatureGate({ permissions: ['*'] });
    expect(gate({ role: 'admin', permissions: ['posts:edit'] })).toBe(false);
    expect(gate({ role: 'guest', permissions: ['*'] })).toBe(true);
  });

  it('captures all configuration arrays independently from the caller', () => {
    const config = {
      roles: ['editor'], minRole: 'editor', roleHierarchy: ['admin', 'editor', 'viewer'], permissions: ['edit'],
    };
    const gate = createFeatureGate(config);
    config.roles.push('viewer');
    config.minRole = 'viewer';
    config.roleHierarchy.reverse();
    config.permissions.length = 0;
    expect(gate({ role: 'viewer', permissions: [] })).toBe(false);
    expect(gate({ role: 'editor', permissions: [] })).toBe(false);
    expect(gate({ role: 'editor', permissions: ['edit'] })).toBe(true);
    expect(createFeatureGate(config)({ role: 'viewer', permissions: [] })).toBe(true);
  });

  it('returns detached frozen snapshots without narrowing the original objects', () => {
    const config = { roles: ['editor'], minRole: 'editor', roleHierarchy: ['admin', 'editor'], permissions: ['edit'] };
    const snapshot = snapshotFeatureGateConfig(config);
    expect(snapshot).toEqual(config);
    expect(snapshot).not.toBe(config);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.roles)).toBe(true);
    expect(Object.isFrozen(snapshot.roleHierarchy)).toBe(true);
    expect(Object.isFrozen(snapshot.permissions)).toBe(true);
    const input = { role: 'editor', permissions: ['edit'] };
    const user = parseFeatureGateUser(input);
    expect(user).toEqual(input);
    expect(user).not.toBe(input);
    expect(Object.isFrozen(user)).toBe(true);
    expect(Object.isFrozen(user?.permissions)).toBe(true);
    input.permissions.length = 0;
    expect(user?.permissions).toEqual(['edit']);
  });

  it('reads fresh validated hints on each invocation without retaining a prior decision', () => {
    const user = { role: 'editor', permissions: ['edit'] };
    const gate = createFeatureGate({ permissions: ['edit'] });
    expect(gate(user)).toBe(true);
    user.permissions.length = 0;
    expect(gate(user)).toBe(false);
    user.permissions.push('edit');
    expect(gate(user)).toBe(true);
  });

  it('rejects configuration getters without executing them', () => {
    const getter = vi.fn(() => []);
    const config = Object.defineProperty({}, 'roles', { enumerable: true, get: getter });
    expect(() => createRaw(config)).toThrow('Invalid feature gate configuration');
    expect(getter).not.toHaveBeenCalled();
  });

  it.each(['role', 'permissions'] as const)('does not execute user %s getters', field => {
    const getter = vi.fn(() => field === 'role' ? 'admin' : ['edit']);
    const user = Object.defineProperty({ role: 'admin', permissions: ['edit'] }, field, { enumerable: true, get: getter });
    expect(evaluate(createFeatureGate({ permissions: ['edit'] }), user)).toBe(false);
    expect(getter).not.toHaveBeenCalled();
  });

  it('does not invoke custom permission collection methods or array prototype methods', () => {
    const includes = vi.fn(() => true);
    const gate = createFeatureGate({ permissions: ['edit'] });
    expect(evaluate(gate, { role: 'admin', permissions: { includes } })).toBe(false);
    const permissions: string[] = [];
    Object.setPrototypeOf(permissions, { includes });
    expect(evaluate(gate, { role: 'admin', permissions })).toBe(false);
    expect(includes).not.toHaveBeenCalled();
  });

  it('rejects sparse or cyclic input without exceptions escaping evaluation', () => {
    const sparse: string[] = [];
    sparse.length = 1;
    const cyclic: unknown[] = [];
    cyclic.push(cyclic);
    const gate = createFeatureGate({});
    expect(() => createRaw({ roles: sparse })).toThrow('Invalid feature gate configuration');
    expect(evaluate(gate, { role: 'admin', permissions: sparse })).toBe(false);
    expect(evaluate(gate, { role: 'admin', permissions: cyclic })).toBe(false);
  });

  it('contains reflection failures and never includes their diagnostics', () => {
    const value = new Proxy({}, { ownKeys() { throw new Error('private-token'); } });
    expect(() => createRaw(value)).toThrow('Invalid feature gate configuration');
    expect(evaluate(createFeatureGate({}), value)).toBe(false);
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(evaluate(createFeatureGate({}), revoked.proxy)).toBe(false);
  });

  it('uses checked descriptor values rather than contradictory proxy property reads', () => {
    const get = vi.fn(() => { throw new Error('Must not read'); });
    const config = new Proxy({ permissions: ['edit'] }, { get });
    const user = new Proxy({ role: 'editor', permissions: ['edit'] }, { get });
    const gate = createFeatureGate(config);
    expect(gate(user)).toBe(true);
    expect(get).not.toHaveBeenCalled();
  });

  it('cannot drop required permissions through a changing proxy array length', () => {
    let reads = 0;
    const permissions = new Proxy(['edit'], {
      get(target, key, receiver) {
        if (key === 'length') return ++reads === 1 ? 1 : 0;
        return Reflect.get(target, key, receiver);
      },
    });
    const gate = createFeatureGate({ permissions });
    expect(gate({ role: 'editor', permissions: [] })).toBe(false);
    expect(reads).toBe(0);
  });

  it.each([
    { input: [] }, { input: ['edit'] }, { input: [[1, 2], null] }, { input: Object.freeze(['edit']) },
  ])('preserves ordinary array snapshots %j', ({ input }) => {
    const snapshot = snapshotPlainData(input);
    expect(snapshot).toEqual(input);
    expect(snapshot).not.toBe(input);
  });

  it.each([undefined, -1, 0, 2, 1.5, Number.NaN])('rejects inconsistent reflected array lengths %s', length => {
    const array = new Proxy(['edit'], {
      getOwnPropertyDescriptor(target, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        return key === 'length' && descriptor ? { ...descriptor, value: length } : descriptor;
      },
    });
    expect(() => snapshotPlainData(array)).toThrow('Invalid plain data');
  });

  it('rejects accessor-backed array entries without reading them', () => {
    const getter = vi.fn(() => 'edit');
    const values = ['edit'];
    Object.defineProperty(values, '0', { enumerable: true, get: getter });
    expect(() => snapshotPlainData(values)).toThrow('Invalid plain data');
    expect(getter).not.toHaveBeenCalled();
  });

  it('does not let user reflection change captured rule constraints', () => {
    const config = { roles: ['editor'], permissions: ['edit'] };
    const gate = createFeatureGate(config);
    const user = new Proxy({ role: 'viewer', permissions: [] }, {
      ownKeys(target) {
        config.roles.push('viewer');
        config.permissions.length = 0;
        return Reflect.ownKeys(target);
      },
    });
    expect(gate(user)).toBe(false);
    expect(config.roles).toContain('viewer');
  });

  it('does not override a configured access-control denial', async () => {
    setAccessControlProvider({ can: async () => ({ can: false, reason: 'Policy denied' }) });
    const gate = createFeatureGate({ roles: ['admin'] });
    expect(gate({ role: 'admin', permissions: ['*'] })).toBe(true);
    await expect(canAccessAsync('users', 'delete')).resolves.toEqual({ can: false, reason: 'Policy denied' });
  });
});
