import { describe, expect, it } from 'bun:test';
import { omitReactiveMembers, replaceReactiveMembers } from './reactive-projection';

describe('reactive member projection', () => {
  it('reads current getters with their original receiver', () => {
    const source = { count: 1, get doubled() { return this.count * 2; } };
    const replacement = { offset: 2, get total() { return source.count + this.offset; } };
    const projected = replaceReactiveMembers(source, replacement);
    expect(projected.doubled).toBe(2);
    expect(projected.total).toBe(3);
    source.count = 5;
    expect(projected.doubled).toBe(10);
    expect(projected.total).toBe(7);
    projected.count = 7;
    projected.offset = 3;
    expect(source.count).toBe(7);
    expect(replacement.offset).toBe(3);
    expect(projected.total).toBe(10);
  });

  it('replaces members without mutating the source', () => {
    const source = { value: 'source', state: 1 };
    const projected = replaceReactiveMembers(source, { value: 2 });
    expect(projected.value).toBe(2);
    expect(source.value).toBe('source');
    expect(Object.keys(projected).sort()).toEqual(['state', 'value']);
    expect({ ...projected }).toEqual({ value: 2, state: 1 });
    expect(Object.getOwnPropertyDescriptor(projected, 'value')?.value).toBe(2);
  });

  it('actually hides omitted members from reads, writes, and reflection', () => {
    const secret = Symbol('hidden');
    const source = { value: 1, setAction: () => 'edit', [secret]: 'private' };
    const projected = omitReactiveMembers(source, ['setAction', secret]);
    expect(Reflect.get(projected, 'setAction')).toBeUndefined();
    expect(Reflect.get(projected, secret)).toBeUndefined();
    expect('setAction' in projected).toBe(false);
    expect(Reflect.set(projected, 'setAction', () => 'create')).toBe(false);
    expect(Object.getOwnPropertyDescriptor(projected, 'setAction')).toBeUndefined();
    expect(Reflect.ownKeys(projected)).toEqual(['value']);
    expect(source.setAction()).toBe('edit');
    source.value = 4;
    expect(projected.value).toBe(4);
  });

  it('keeps symbol members and composes omission with replacement', () => {
    const key = Symbol('value');
    const source = { [key]: 1, id: 2, setId: (id: number) => { source.id = id; } };
    const projected = replaceReactiveMembers(omitReactiveMembers(source, ['setId']), {
      get id() { return String(source.id); },
    });
    source.setId(3);
    expect(projected.id).toBe('3');
    expect(projected[key]).toBe(1);
    expect(new Set(Reflect.ownKeys(projected))).toEqual(new Set([key, 'id']));
  });
});
