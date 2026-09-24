import { createProviderBundle, defineAdminConfig } from '@svadmin/app';
import { resources } from './resources';
import { createDemoProvider, type DemoScenario } from './demo/provider';

const requested = import.meta.env.DEV ? new URLSearchParams(location.search).get('scenario') : null;
const scenarios: readonly string[] = ['normal', 'empty', 'error', 'loading', 'denied', 'partial', 'readonly'];
const scenario: DemoScenario = requested !== null && scenarios.includes(requested) ? requested as DemoScenario : 'normal';

export default defineAdminConfig({
  name: 'customer-workspace',
  providers: createProviderBundle({
    dataProvider: createDemoProvider(scenario),
    accessControlProvider: {
      can: async ({ action }) => ({
        can: scenario !== 'denied' && (scenario !== 'readonly' || ['list', 'show', 'field'].includes(action)),
      }),
      options: { buttons: { enableAccessControl: true, hideIfUnauthorized: true } },
    },
  }),
  resources,
});
