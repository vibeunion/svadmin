// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { readHashParam, replaceHashParam } from '../src/utils/hashView';

describe('hash view params', () => {
  beforeEach(() => {
    window.location.hash = '#/project_planning?sort=dueDate&order=asc';
  });

  it('adds a workspace state param without dropping table state', () => {
    replaceHashParam('records', '1');

    expect(window.location.hash).toBe('#/project_planning?sort=dueDate&order=asc&records=1');
    expect(readHashParam('records')).toBe('1');
  });

  it('removes only the requested workspace state param', () => {
    replaceHashParam('records', '1');
    replaceHashParam('records', null);

    expect(window.location.hash).toBe('#/project_planning?sort=dueDate&order=asc');
  });
});
