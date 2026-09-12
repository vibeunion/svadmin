import { requireValue } from '../test/assertions';
// HttpError + CrudOperator + LogicalFilter tests

import { describe,test,expect } from 'bun:test';
import { HttpError } from './types';
import type { CrudOperator,Filter,LogicalFilter } from './types';

describe('HttpError',() => {
  test('creates with message and statusCode',() => {
    const err=new HttpError('Not Found',404);
    expect(err.message).toBe('Not Found');
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe('HttpError');
    expect(err.errors).toBeUndefined();
  });

  test('creates with validation errors',() => {
    const err=new HttpError('Validation Failed',422,{
      email: ['Email is required','Email must be valid'],
      name: 'Name is required',
    });
    expect(err.statusCode).toBe(422);
    expect(requireValue(err.errors)['email']).toEqual(['Email is required','Email must be valid']);
    expect(requireValue(err.errors)['name']).toBe('Name is required');
  });

  test('is instanceof Error',() => {
    const err=new HttpError('Server Error',500);
    expect(err instanceof Error).toBe(true);
    expect(err instanceof HttpError).toBe(true);
  });

  test('preserves structured response metadata and cause',() => {
    const cause=new Error('upstream failed');
    const body={ code: 'upstream_error',details: { requestId: 'req-1' } };
    const err=new HttpError('Bad Gateway',502,undefined,{
      code: 'upstream_error',
      details: body.details,
      body,
      cause,
    });

    expect(err.code).toBe('upstream_error');
    expect(err.details).toEqual({ requestId: 'req-1' });
    expect(err.body).toBe(body);
    expect(err.cause).toBe(cause);
  });
});

describe('CrudOperator types',() => {
  test('all operators are valid',() => {
    const operators: CrudOperator[]=[
      'eq','ne','lt','gt','lte','gte',
      'contains','ncontains',
      'startswith','endswith',
      'in','nin',
      'null','nnull',
      'between','nbetween',
    ];
    expect(operators).toHaveLength(16);
  });

  test('Filter uses CrudOperator',() => {
    const filter: Filter={ field: 'name',operator: 'startswith',value: 'A' };
    expect(filter.operator).toBe('startswith');
  });

  test('negation operators',() => {
    const filters: Filter[]=[
      { field: 'status',operator: 'ncontains',value: 'draft' },
      { field: 'deleted_at',operator: 'nnull',value: null },
      { field: 'category',operator: 'nin',value: [1,2] },
      { field: 'price',operator: 'nbetween',value: [100,200] },
    ];
    expect(filters).toHaveLength(4);
  });
});

describe('LogicalFilter',() => {
  test('or combination',() => {
    const logical: LogicalFilter={
      operator: 'or',
      value: [
        { field: 'status',operator: 'eq',value: 'published' },
        { field: 'status',operator: 'eq',value: 'draft' },
      ],
    };
    expect(logical.operator).toBe('or');
    expect(logical.value).toHaveLength(2);
  });

  test('and combination',() => {
    const logical: LogicalFilter={
      operator: 'and',
      value: [
        { field: 'price',operator: 'gte',value: 10 },
        { field: 'price',operator: 'lte',value: 100 },
      ],
    };
    expect(logical.operator).toBe('and');
    expect(logical.value).toHaveLength(2);
  });
});
