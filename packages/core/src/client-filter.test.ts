import { describe, expect, test } from 'bun:test';
import { matchClientFilter } from './client-filter';

describe('client filter case sensitivity', () => {
  const row = { title: 'Hello World' };

  test('contains is case-insensitive and containss is case-sensitive', () => {
    expect(matchClientFilter(row, { field: 'title', operator: 'contains', value: 'hello' })).toBe(true);
    expect(matchClientFilter(row, { field: 'title', operator: 'containss', value: 'hello' })).toBe(false);
    expect(matchClientFilter(row, { field: 'title', operator: 'containss', value: 'Hello' })).toBe(true);
    expect(matchClientFilter(row, { field: 'title', operator: 'ncontains', value: 'HELLO' })).toBe(false);
    expect(matchClientFilter(row, { field: 'title', operator: 'ncontainss', value: 'HELLO' })).toBe(true);
  });

  test('startswith and endswith follow the same case pairs', () => {
    expect(matchClientFilter(row, { field: 'title', operator: 'startswith', value: 'hello' })).toBe(true);
    expect(matchClientFilter(row, { field: 'title', operator: 'startswiths', value: 'hello' })).toBe(false);
    expect(matchClientFilter(row, { field: 'title', operator: 'nstartswith', value: 'HELLO' })).toBe(false);
    expect(matchClientFilter(row, { field: 'title', operator: 'nstartswiths', value: 'HELLO' })).toBe(true);
    expect(matchClientFilter(row, { field: 'title', operator: 'endswith', value: 'WORLD' })).toBe(true);
    expect(matchClientFilter(row, { field: 'title', operator: 'endswiths', value: 'WORLD' })).toBe(false);
    expect(matchClientFilter(row, { field: 'title', operator: 'nendswith', value: 'world' })).toBe(false);
    expect(matchClientFilter(row, { field: 'title', operator: 'nendswiths', value: 'world' })).toBe(true);
  });
});
