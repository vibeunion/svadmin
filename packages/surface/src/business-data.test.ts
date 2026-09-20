import { describe, expect, it } from 'vitest';
import { asSurfaceActivities } from './business-data.js';
import type { ActivityFeedProps } from './business-definitions.js';
import type { JsonValue } from './types.js';
const props: ActivityFeedProps = { title: 'Activity', idField: 'id', actionField: 'action', timestampField: 'at', actorField: 'actor', commentField: 'comment', statusField: 'status' };
const row = { id: 1, action: 'Created', at: '2026-09-20T00:00:00Z', actor: 'Synthetic operator', status: 'success', comment: '<img src=x onerror=alert(1)>' };
describe('bounded activity field mapping', () => {
  it('maps only requested fields and never creates an avatar, URL or write handler', () => {
    const result = asSurfaceActivities([{ ...row, secret: 'hidden', avatar: 'https://untrusted.invalid' }], props, 'Unknown');
    expect(result).toMatchObject({ ok: true, value: [{ id: 'number:1', user: { name: 'Synthetic operator' }, action: 'Created', comment: row.comment }] });
    expect(JSON.stringify(result)).not.toContain('hidden'); expect(JSON.stringify(result)).not.toContain('https:');
  });
  it('preserves distinct numeric/string IDs and rejects identical IDs', () => {
    expect(asSurfaceActivities([row, { ...row, id: '1' }], props, 'Unknown').ok).toBe(true);
    expect(asSurfaceActivities([row, row], props, 'Unknown').ok).toBe(false);
  });
  it('marks absent or blank actor as unknown, not System or a fictional person', () => {
    const result = asSurfaceActivities([{ ...row, actor: '' }], props, '未知操作者');
    expect(result).toMatchObject({ ok: true, value: [{ user: { name: '未知操作者' } }] });
  });
  it.each(([null, {}, [null], [{ ...row, id: '' }], [{ ...row, action: 1 }], [{ ...row, at: null }],
    [{ ...row, status: 'approved' }], [{ ...row, actor: {} }], [{ ...row, comment: 'x'.repeat(4001) }],
    Array.from({ length: 101 }, (_, id) => ({ ...row, id }))] satisfies JsonValue[]).map((value) => ({ value })))('rejects invalid or oversized activity data', ({ value }) => {
    expect(asSurfaceActivities(value, props, 'Unknown').ok).toBe(false);
  });
  it('keeps a genuinely empty collection empty', () => {
    expect(asSurfaceActivities([], props, 'Unknown')).toEqual({ ok: true, value: [] });
  });
});
