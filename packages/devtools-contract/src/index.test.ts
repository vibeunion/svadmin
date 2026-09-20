import { describe, expect, it } from 'vitest';
import { createDevtoolsSnapshot, redactDevtoolsRecord } from './index';

describe('devtools contract', () => {
  it('redacts nested credentials', () => {
    expect(redactDevtoolsRecord({
      requestId: 'req-1',
      authorization: 'Bearer secret',
      nested: { service_role_key: 'private' },
    })).toEqual({
      requestId: 'req-1',
      authorization: '[redacted]',
      nested: { service_role_key: '[redacted]' },
    });
  });

  it('creates a versioned traceable snapshot', () => {
    expect(createDevtoolsSnapshot({
      source: 'frontend',
      requestId: 'req-1',
      traceId: 'trace-1',
      correlationId: 'workflow-1',
      diagnostics: [],
      events: [],
    })).toMatchObject({
      version: 1,
      source: 'frontend',
      requestId: 'req-1',
      traceId: 'trace-1',
      correlationId: 'workflow-1',
    });
  });
});
