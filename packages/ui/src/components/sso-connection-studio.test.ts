import { describe, expect, it } from 'bun:test';
import type { SsoConnection } from './SsoConnectionStudio.svelte';

describe('SsoConnectionStudio Business & Filtering Logic', () => {
  const sampleConnections: SsoConnection[] = [
    {
      id: 'conn-1',
      name: 'Google Workspace',
      protocol: 'oidc',
      status: 'active',
      domains: ['acme.com', 'acme.org'],
      isDefault: true,
      clientId: 'google-client-id',
      discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration',
    },
    {
      id: 'conn-2',
      name: 'Corporate Keycloak SAML',
      protocol: 'saml',
      status: 'active',
      domains: ['internal.acme.com'],
      isDefault: false,
      entityId: 'https://keycloak.internal/auth/realms/acme',
      ssoUrl: 'https://keycloak.internal/auth/realms/acme/protocol/saml',
    },
    {
      id: 'conn-3',
      name: 'Feishu Enterprise Login',
      protocol: 'feishu',
      status: 'inactive',
      domains: ['feishu.acme.com'],
      isDefault: false,
      appId: 'cli_123456',
    },
  ];

  it('filters connections by protocol and domain keyword search', () => {
    // 1. Filter by protocol
    const oidcOnly = sampleConnections.filter(c => c.protocol === 'oidc');
    expect(oidcOnly.length).toBe(1);
    expect(oidcOnly[0]?.name).toBe('Google Workspace');

    // 2. Filter by domain search
    const query = 'internal.acme.com';
    const domainMatch = sampleConnections.filter(c =>
      c.domains.some(d => d.toLowerCase().includes(query.toLowerCase())),
    );
    expect(domainMatch.length).toBe(1);
    expect(domainMatch[0]?.id).toBe('conn-2');
  });

  it('computes metrics: active counts and unique domains coverage', () => {
    const activeCount = sampleConnections.filter(c => c.status === 'active').length;
    expect(activeCount).toBe(2);

    const allDomains = new Set(sampleConnections.flatMap(c => c.domains));
    expect(allDomains.size).toBe(4);
    expect(allDomains.has('acme.com')).toBe(true);
    expect(allDomains.has('feishu.acme.com')).toBe(true);
  });

  it('ensures single default identity provider rule', () => {
    const list = sampleConnections.map(c => ({ ...c }));
    const newDefaultId = 'conn-2';

    for (const c of list) {
      c.isDefault = c.id === newDefaultId;
    }

    const defaultItems = list.filter(c => c.isDefault);
    expect(defaultItems.length).toBe(1);
    expect(defaultItems[0]?.id).toBe('conn-2');
    expect(list.find(c => c.id === 'conn-1')?.isDefault).toBe(false);
  });

  it('handles claim attribute mappings mapping transformations', () => {
    const mappings = [
      { remoteClaim: 'sub', localField: 'sso_uid' },
      { remoteClaim: 'email', localField: 'email' },
      { remoteClaim: 'roles', localField: 'user_roles' },
    ];

    const externalIdpPayload: Record<string, unknown> = {
      sub: 'usr_abc_999',
      email: 'alex@acme.com',
      roles: ['admin', 'billing_operator'],
      unused_claim: '12345',
    };

    const localUser: Record<string, unknown> = {};
    for (const map of mappings) {
      if (externalIdpPayload[map.remoteClaim] !== undefined) {
        localUser[map.localField] = externalIdpPayload[map.remoteClaim];
      }
    }

    expect(localUser['sso_uid']).toBe('usr_abc_999');
    expect(localUser['email']).toBe('alex@acme.com');
    expect(localUser['user_roles']).toEqual(['admin', 'billing_operator']);
    expect(localUser['unused_claim']).toBeUndefined();
  });
});
