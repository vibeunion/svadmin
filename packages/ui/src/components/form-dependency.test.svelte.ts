import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import FormDependency from './FormDependency.svelte';
import { createRawSnippet } from 'svelte';

describe('FormDependency', () => {
  it('extracts watched fields and renders children snippet', () => {
    const values = {
      role: 'admin',
      region: 'cn',
      secret: 'hidden-token',
    };

    const snippet = createRawSnippet((getWatched: () => Record<string, unknown>) => ({
      render: () => {
        const w = getWatched();
        return `<div>Watched Role: ${w.role}, HasSecret: ${Boolean(w.secret)}</div>`;
      },
    }));

    render(FormDependency, {
      name: ['role'],
      values,
      children: snippet,
    });

    expect(screen.getByText('Watched Role: admin, HasSecret: false')).toBeTruthy();
  });
});
