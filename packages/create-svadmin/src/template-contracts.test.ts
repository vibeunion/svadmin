import { describe, expect, it } from 'bun:test';
import { getContractFormFields, parseContractCreateInput, parseContractUpdateInput } from '@svadmin/core/resource-contract';
import { posts, users, comments, todos } from '../template/src/resource-contracts';

describe('starter resource write contracts', () => {
  it('accepts valid create and edit inputs for the advertised workflows', () => {
    expect(parseContractCreateInput(posts, { title: 'First post', body: '', userId: 1 })).toEqual({ title: 'First post', body: '', userId: 1 });
    expect(parseContractUpdateInput(posts, { title: 'Updated' })).toEqual({ title: 'Updated' });
    expect(parseContractCreateInput(comments, { name: 'Review', email: 'a@example.test', postId: 1, body: '' })).toBeTruthy();
    expect(parseContractCreateInput(todos, { title: 'Review order', userId: 1, completed: false })).toBeTruthy();
    expect(parseContractUpdateInput(users, { name: 'Ada' })).toEqual({ name: 'Ada' });
    expect(getContractFormFields(users, 'edit')).toContain('email');
  });

  it('rejects empty titles, unknown fields, wrong types, and user creation', () => {
    expect(() => parseContractCreateInput(posts, { title: '', body: '', userId: 1 })).toThrow();
    expect(() => parseContractCreateInput(posts, { title: 'Post', body: '', userId: '1' })).toThrow();
    expect(() => parseContractUpdateInput(posts, { title: 'Post', administrator: true })).toThrow();
    expect(() => parseContractCreateInput(users, {})).toThrow();
  });
});
