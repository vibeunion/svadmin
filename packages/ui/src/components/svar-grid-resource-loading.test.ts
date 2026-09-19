import { describe, it } from 'vitest';
import { svarResourceLoadingCases } from './svar-grid-resource-loading.test-cases.js';

describe('SVAR resource loading through core pagination', () => {
  for (const scenario of svarResourceLoadingCases) it(scenario.name, scenario.run);
});
