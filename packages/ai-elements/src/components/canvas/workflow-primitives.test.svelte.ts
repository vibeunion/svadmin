import { render, waitFor } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import WorkflowPrimitivesHost from './workflow-primitives.test-host.svelte';
import WorkflowGeometryHost from './workflow-geometry.test-host.svelte';

describe('workflow primitives', () => {
  it('composes the official workflow surface on Svelte Flow', async () => {
    const { container, getByRole, getByText } = render(WorkflowPrimitivesHost);

    expect(container.querySelector('[data-testid="svelte-flow__wrapper"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="svelte-flow__background"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="controls"]')).not.toBeNull();
    expect(getByText('Workflow panel')).not.toBeNull();

    await waitFor(() => expect(getByText('Review request')).not.toBeNull());
    expect(container.querySelectorAll('.svelte-flow__handle')).toHaveLength(2);
    expect(container.querySelector('button[aria-label="Node action"]')).not.toBeNull();
    expect(getByRole('button', { name: 'Run' })).not.toBeNull();
  });

  it('renders the connection line with the official cubic geometry', () => {
    const { container } = render(WorkflowGeometryHost, { props: { kind: 'connection' } });
    const path = container.querySelector('path');
    const target = container.querySelector('circle');

    expect(path?.getAttribute('d')).toBe('M10,20 C 60,20 60,80 110,80');
    expect(target?.getAttribute('cx')).toBe('110');
    expect(target?.getAttribute('cy')).toBe('80');
  });

  it('provides temporary and animated edge renderers', () => {
    const temporary = render(WorkflowGeometryHost, { props: { kind: 'temporary' } });
    expect(temporary.container.querySelector('path')?.getAttribute('style')).toContain('stroke-dasharray');
    temporary.unmount();

    const animated = render(WorkflowGeometryHost, { props: { kind: 'animated' } });
    const motion = animated.container.querySelector('animateMotion');
    expect(motion?.getAttribute('dur')).toBe('2s');
    expect(motion?.getAttribute('path')).toMatch(/^M/);
  });
});
