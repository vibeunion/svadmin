<script lang="ts">
  import { provideAdminContext, type DataProvider, type EnterpriseSecurityPolicy, type IdentityGovernanceProvider, type Organization, type OrganizationProvider } from '@svadmin/core';
  import SettingsEnterprisePage from '../../../packages/ui/src/components/account/SettingsEnterprisePage.svelte';

  let calls = $state(0);
  let target = $state('');
  let feedback = $state('');
  let policySaves = $state(0);
  let organizationSaves = $state(0);
  let savedPolicy = $state<EnterpriseSecurityPolicy | null>(null);
  let savedOrganization = $state<Partial<Omit<Organization, 'id'>> | null>(null);
  let complete: ((result: { success: boolean }) => void) | undefined;
  const params = new URLSearchParams(window.location.search);
  const failLoad = params.has('fail-load');
  const failPolicy = params.has('fail-policy');
  const failOrganization = params.has('fail-organization');
  let loadCount = 0;
  let displayedLoadCount = $state(0);
  let policySaveCount = 0;
  let organizationSaveCount = 0;
  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  const identityGovernanceProvider: IdentityGovernanceProvider = {
    getSecurityPolicy: async () => {
      loadCount += 1;
      displayedLoadCount = loadCount;
      if (failLoad && loadCount === 1) throw new Error('PRIVATE_ENTERPRISE_READ_FIXTURE');
      return {
        sessionTimeoutMinutes: 30, auditRetentionDays: 365, auditLoggingEnabled: true, requireSso: false,
      };
    },
    updateSecurityPolicy: async (policy) => {
      policySaveCount += 1;
      policySaves = policySaveCount;
      if (failPolicy && policySaveCount === 1) throw new Error('PRIVATE_ENTERPRISE_POLICY_FIXTURE');
      savedPolicy = policy;
      return policy;
    },
    listIdentityProviders: async () => [
      { id: 'oidc', name: 'Company OIDC', protocol: 'oidc', status: 'connected' },
      { id: 'saml', name: 'Partner SAML', protocol: 'saml', status: 'disabled' },
    ],
    testIdentityProvider: async (params) => {
      calls += 1;
      target = params.id ?? '';
      return new Promise(resolve => { complete = resolve; });
    },
  };
  const organizationProvider: OrganizationProvider = {
    getCurrentOrganization: async () => ({ id: 'org-1', name: 'Northwind Research' }),
    updateCurrentOrganization: async input => {
      organizationSaveCount += 1;
      organizationSaves = organizationSaveCount;
      if (failOrganization && organizationSaveCount === 1) throw new Error('PRIVATE_ENTERPRISE_ORGANIZATION_FIXTURE');
      savedOrganization = input;
      return { id: 'org-1', name: input.name ?? 'Northwind Research' };
    },
  };
  provideAdminContext({
    dataProvider,
    identityGovernanceProvider,
    organizationProvider,
    notificationProvider: { open: (notification) => { feedback = notification.message; }, close: () => {} },
  });
  function finish(success: boolean): void {
    complete?.({ success });
    complete = undefined;
  }
</script>

<div data-testid="enterprise-page"><SettingsEnterprisePage /></div>
<aside aria-label="Fixture controls">
  <button type="button" onclick={() => finish(false)}>Fail test</button>
  <button type="button" onclick={() => finish(true)}>Complete test</button>
  <p data-testid="connection-calls">{calls}</p>
  <p data-testid="connection-target">{target}</p>
  <p data-testid="settings-loads">{displayedLoadCount}</p>
  <p data-testid="policy-saves">{policySaves}</p>
  <p data-testid="organization-saves">{organizationSaves}</p>
  <pre data-testid="saved-policy">{JSON.stringify(savedPolicy)}</pre>
  <pre data-testid="saved-organization">{JSON.stringify(savedOrganization)}</pre>
  <p role="status">{feedback}</p>
</aside>
