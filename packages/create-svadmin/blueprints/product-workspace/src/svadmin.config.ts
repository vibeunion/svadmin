import { createProviderBundle, defineAdminConfig } from '@svadmin/app';
import { productResources } from './generated/resources';
import { createProductProvider, type ProductScenario } from './product-provider';

const requested = typeof location !== 'undefined' && import.meta.env.DEV
  ? new URLSearchParams(location.search).get('scenario')
  : null;
const scenarios: readonly string[] = ['normal', 'empty', 'error', 'loading', 'denied', 'readonly'];
const scenario: ProductScenario = requested !== null && scenarios.includes(requested)
  ? scenarioFrom(requested)
  : 'normal';

function scenarioFrom(value: string): ProductScenario {
  return value as ProductScenario;
}

export default defineAdminConfig({
  name: 'product-workspace',
  providers: createProviderBundle({
    dataProvider: createProductProvider(scenario),
    accessControlProvider: {
      can: async ({ action }) => ({
        can: scenario !== 'denied' && (scenario !== 'readonly' || ['list', 'show', 'field'].includes(action)),
      }),
      options: { buttons: { enableAccessControl: true, hideIfUnauthorized: true } },
    },
  }),
  resources: productResources,
});
