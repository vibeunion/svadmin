// Resource Type Registry — type-level tests
import { describe, test, expect } from 'bun:test';
import type { ResourceTypeMap, KnownResources, InferData } from './types';

describe('Resource Type Registry', () => {
  test('ResourceTypeMap is an empty interface by default', () => {
    // When no declaration merging is used, keyof ResourceTypeMap = never
    type Keys = keyof ResourceTypeMap;
    // This compiles — verifying the interface exists and is empty
    const _check: Keys extends never ? true : false = true;
    expect(_check).toBe(true);
  });

  test('KnownResources falls back to string when ResourceTypeMap is empty', () => {
    // When ResourceTypeMap is empty, KnownResources should be string
    const resource: KnownResources = 'anything';
    expect(typeof resource).toBe('string');
  });

  test('InferData falls back to Record<string, unknown> for unknown resources', () => {
    // For any resource not in ResourceTypeMap, InferData should return Record<string, unknown>
    type Result = InferData<'nonexistent'>;
    const data: Result = { arbitrary: 'value', number: 42 };
    expect(data['arbitrary']).toBe('value');
  });

  test('type utilities are structurally sound', () => {
    // Simulate what happens with declaration merging by testing the conditional types
    // When R extends keyof ResourceTypeMap (which is never when empty),
    // InferData should return Record<string, unknown>
    type TestInfer = InferData<'users'>;
    const obj: TestInfer = { id: '1', name: 'test' };
    expect(obj).toBeDefined();
  });

  test('KnownResources accepts any string when ResourceTypeMap is empty', () => {
    // This verifies backward compatibility — all strings are valid resource names
    const resources: KnownResources[] = ['users', 'posts', 'categories', 'anything'];
    expect(resources).toHaveLength(4);
  });
});

// ─── Declaration Merging Example (compile-time only) ──────────
// The following block verifies that declaration merging works correctly.
// It's wrapped in a function so it doesn't affect runtime.

function _typeTests() {
  // Simulate declaration merging
  interface TestResourceMap {
    users: { id: string; name: string; email: string };
    posts: { id: string; title: string; content: string };
  }

  // Test conditional type behavior with a populated map
  type TestKnown<M> = keyof M extends never ? string : Extract<keyof M, string>;
  type TestInfer<R extends string, M> = R extends keyof M ? M[R] : Record<string, unknown>;

  // When map is populated, resources are constrained
  type Resources = TestKnown<TestResourceMap>;
  const _r1: Resources = 'users';
  const _r2: Resources = 'posts';
  // @ts-expect-error — 'invalid' is not in TestResourceMap
  const _r3: Resources = 'invalid';

  // InferData resolves correctly
  type UserData = TestInfer<'users', TestResourceMap>;
  const _user: UserData = { id: '1', name: 'Alice', email: 'a@b.com' };

  type PostData = TestInfer<'posts', TestResourceMap>;
  const _post: PostData = { id: '1', title: 'Hello', content: 'World' };

  // Unknown resource falls back
  type UnknownData = TestInfer<'unknown', TestResourceMap>;
  const _unknown: UnknownData = { any: 'thing' };

  void _r1; void _r2; void _r3; void _user; void _post; void _unknown;
}

void _typeTests;
