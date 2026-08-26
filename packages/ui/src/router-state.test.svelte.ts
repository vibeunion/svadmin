import { describe, expect, it } from 'vitest';
import type { RouterProvider } from '@svadmin/core';
import { createRouterState } from './router-state.svelte.js';

describe('createRouterState', () => {
  it('keeps matched path params authoritative while preserving non-conflicting provider params', () => {
    const provider: RouterProvider = {
      go: () => {},
      back: () => {},
      parse: () => ({
        pathname: '/products/edit/1',
        params: {
          id: '2',
          resource: 'users',
          view: 'compact',
        },
      }),
    };
    const state = createRouterState();

    state.init(provider);

    expect(state.route).toBe('/:resource/edit/:id');
    expect(state.params).toEqual({
      id: '1',
      resource: 'products',
      view: 'compact',
    });
    state.destroy();
  });

  it.each([
    ['/products/1/edit', '/:resource/:id/edit'],
    ['/products/1', '/:resource/:id'],
  ])('supports legacy resource routes: %s', (pathname, expectedRoute) => {
    const provider: RouterProvider = {
      go: () => {},
      back: () => {},
      parse: () => ({ pathname, params: {} }),
    };
    const state = createRouterState();

    state.init(provider);

    expect(state.route).toBe(expectedRoute);
    expect(state.params).toMatchObject({ resource: 'products', id: '1' });
    state.destroy();
  });
});
