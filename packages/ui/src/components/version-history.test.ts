import { describe, expect, it } from 'vitest';
import { selectRecordVersion, type StoredRecordVersion } from './version-history';

const versions: StoredRecordVersion[] = [
  { id: 'v2', version: 2, title: 'Published', snapshot: { title: 'After' } },
  { id: 'v1', version: 1, title: 'Draft', snapshot: { title: 'Before' } },
];

describe('selectRecordVersion', () => {
  it('uses the previous stored snapshot as the old value', () => {
    expect(selectRecordVersion(versions, 'v2')).toEqual({
      oldValue: { title: 'Before' },
      newValue: { title: 'After' },
      oldTitle: 'Draft',
      newTitle: 'Published',
    });
  });

  it('uses an empty old value for the first version', () => {
    expect(selectRecordVersion(versions, 'v1')).toEqual({
      oldValue: {},
      newValue: { title: 'Before' },
      newTitle: 'Draft',
    });
  });

  it('fails closed for unknown, duplicate, or non-object snapshots', () => {
    expect(selectRecordVersion(versions, 'missing')).toBeNull();
    expect(selectRecordVersion(versions, '')).toBeNull();
    expect(selectRecordVersion([
      { id: 'a', version: 1, snapshot: { title: 'A' } },
      { id: 'b', version: 1, snapshot: { title: 'B' } },
    ], 'b')).toBeNull();
    expect(selectRecordVersion([
      { id: 'bad', version: 1, snapshot: [] as unknown as Record<string, unknown> },
    ], 'bad')).toBeNull();
  });
});
