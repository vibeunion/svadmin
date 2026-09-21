import { describe, expect, test } from 'bun:test';
import {
  ENTERPRISE_MATURITY,
  enterpriseMaturityFor,
} from './enterprise-maturity';

describe('enterprise maturity boundary', () => {
  test('keeps P0 and P1 deliverable while P2 remains an extension tier', () => {
    expect(enterpriseMaturityFor('P0').every(({ status }) => status === 'stable')).toBe(true);
    expect(enterpriseMaturityFor('P1').every(({ status }) => status === 'verified')).toBe(true);
    expect(enterpriseMaturityFor('P2').every(({ status }) => status === 'experimental' || status === 'planned')).toBe(true);
  });

  test('requires every tier entry to state surfaces and acceptance', () => {
    expect(ENTERPRISE_MATURITY).toHaveLength(5);
    for (const entry of ENTERPRISE_MATURITY) {
      expect(entry.surfaces.length).toBeGreaterThan(0);
      expect(entry.acceptance.length).toBeGreaterThan(0);
    }
  });
});
