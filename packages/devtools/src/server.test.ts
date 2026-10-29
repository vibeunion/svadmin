import { describe, expect, test } from 'bun:test';
import { startDevtoolsServer } from './server';
import type { DevtoolsSnapshot } from '@svadmin/devtools-contract';

const snapshot = { version: 1, traceId: 't1' } as unknown as DevtoolsSnapshot;

describe('devtools server', () => {
  test('serves a redacted snapshot to authenticated local clients', async () => {
    const handle = await startDevtoolsServer({ snapshot: () => snapshot, token: 'secret' });
    try {
      const unauthorized = await fetch(`${handle.url}/snapshot`);
      expect(unauthorized.status).toBe(401);
      const authorized = await fetch(`${handle.url}/snapshot`, { headers: { authorization: 'Bearer secret' } });
      expect(authorized.status).toBe(200);
      expect(await authorized.json()).toMatchObject({ traceId: 't1' });
      const missing = await fetch(`${handle.url}/missing`);
      expect(missing.status).toBe(404);
    } finally {
      await handle.close();
    }
  });

  test('reports snapshot failures without leaking causes', async () => {
    const handle = await startDevtoolsServer({
      snapshot: () => { throw new Error('database password leaked'); },
    });
    try {
      const response = await fetch(`${handle.url}/snapshot`);
      expect(response.status).toBe(500);
      expect(await response.text()).not.toContain('password');
    } finally {
      await handle.close();
    }
  });
});
