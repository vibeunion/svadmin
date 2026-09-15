import { describe, expect, it } from 'vitest';
import { getContractFormFields } from '@svadmin/core/resource-contract';
import { demoContracts } from '../src/resource-contracts';

describe('demo resource contracts', () => {
  it('exposes product create and edit form fields', () => {
    expect(getContractFormFields(demoContracts.products, 'create')).toContain('name');
    expect(getContractFormFields(demoContracts.products, 'edit')).toContain('name');
  });
});
