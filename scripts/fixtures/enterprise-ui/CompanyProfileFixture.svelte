<script lang="ts">
  import { provideAdminContext, type DataProvider, type Organization, type OrganizationProvider } from '@svadmin/core';
  import CompanyProfilePage from '../../../packages/ui/src/components/account/CompanyProfilePage.svelte';

  let reads = 0;
  let writes = 0;
  let saved = $state<Partial<Omit<Organization, 'id'>> | null>(null);
  let writeCount = $state(0);
  const failLoad = new URLSearchParams(window.location.search).has('fail-load');
  const failSave = new URLSearchParams(window.location.search).has('fail-save');
  const organization: Organization = { id: 'fixture-org', name: 'Northwind Research' };
  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  const organizationProvider: OrganizationProvider = {
    getCurrentOrganization: async () => {
      reads += 1;
      if (failLoad && reads === 1) throw new Error('PRIVATE_COMPANY_READ_FIXTURE');
      return organization;
    },
    updateCurrentOrganization: async (input) => {
      writes += 1;
      writeCount = writes;
      if (failSave && writes === 1) throw new Error('PRIVATE_COMPANY_SAVE_FIXTURE');
      saved = input;
      return { ...organization, ...input };
    },
  };
  provideAdminContext({ dataProvider, organizationProvider });
</script>

<section data-testid="company-fixture">
  <div data-testid="company-page"><CompanyProfilePage /></div>
  <aside aria-label="Fixture results">
    <pre data-testid="company-saved">{JSON.stringify(saved)}</pre>
    <p data-testid="company-writes">{writeCount}</p>
  </aside>
</section>
