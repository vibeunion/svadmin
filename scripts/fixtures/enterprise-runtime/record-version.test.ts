import { describe, expect, it } from 'bun:test';
import { SignJWT } from 'jose';
import { selectRecordVersion, type StoredRecordVersion } from '../../../packages/ui/src/components/version-history';

const versionUrl = process.env['SVADMIN_VERSION_URL'];
const jwtSecret = process.env['SVADMIN_STORAGE_JWT_SECRET'];
const enabled = Boolean(process.env['SVADMIN_STORAGE_SMOKE_RUN']);

async function webToken(secret: string): Promise<string> {
  return new SignJWT({ role: 'web' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));
}

describe.skipIf(!enabled)('OrbStack record versions', () => {
  it('stores two snapshots and maps the selected version', async () => {
    if (!versionUrl || !/^http:\/\/127\.0\.0\.1:\d+$/.test(versionUrl) || !jwtSecret || jwtSecret.length < 32) {
      throw new Error('Version smoke requires a loopback URL and temporary credentials');
    }
    const token = await webToken(jwtSecret);
    const recordId = crypto.randomUUID();
    const rows = [
      { resource: 'posts', record_id: recordId, version: 1, title: 'Draft', snapshot: { title: 'Before' } },
      { resource: 'posts', record_id: recordId, version: 2, title: 'Published', snapshot: { title: 'After' } },
    ];
    const inserted = await fetch(`${versionUrl}/record_versions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        prefer: 'return=representation',
      },
      body: JSON.stringify(rows),
      signal: AbortSignal.timeout(8000),
    });
    expect(inserted.ok).toBe(true);
    const stored = await inserted.json() as Array<{ id: string; version: number; title: string; snapshot: Record<string, unknown> }>;
    const selected = stored.find(row => row.version === 2);
    if (!selected) throw new Error('Version service did not return the selected row');

    const read = await fetch(`${versionUrl}/record_versions?resource=eq.posts&record_id=eq.${recordId}&select=id,version,title,snapshot&order=version.asc`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    expect(read.ok).toBe(true);
    const versions = await read.json() as StoredRecordVersion[];
    expect(selectRecordVersion(versions, selected.id)).toEqual({
      oldValue: { title: 'Before' },
      newValue: { title: 'After' },
      oldTitle: 'Draft',
      newTitle: 'Published',
    });
  });
});
