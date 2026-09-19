import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import type { SurfaceWorkflowTransport, SurfaceWorkflowClientScope } from './workflows/client.js';
import Host from './form-scope.test-host.svelte';
const action = { id: 'contacts.create', version: '1', label: 'Create', approval: 'confirm' as const,
  inputSchema: Type.Object({ name: Type.String({ minLength: 1 }) }, { additionalProperties: false }) };
function fixture() {
  const unavailable = vi.fn(async () => { throw new Error('No request expected'); });
  const transport: SurfaceWorkflowTransport = { propose: unavailable, inspect: unavailable, approve: unavailable, reject: unavailable, execute: unavailable };
  const scope: SurfaceWorkflowClientScope = { scopeKey: 'first', surfaceId: 'contacts', revision: 1, enabled: true, transport };
  return { scope, unavailable };
}
describe('form draft scope boundaries', () => {
  it.each(['scopeKey', 'surfaceId', 'revision', 'enabled', 'transport'] as const)('clears draft when %s changes without remounting the widget', async field => {
    const f = fixture(); const view = render(Host, { action, scope: f.scope });
    const input = view.getByRole('textbox') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Private draft' } });
    const patch = field === 'scopeKey' ? { scopeKey: 'second' } : field === 'surfaceId' ? { surfaceId: 'other' }
      : field === 'revision' ? { revision: 2 } : field === 'enabled' ? { enabled: false } : { transport: { ...f.scope.transport } };
    await view.rerender({ scope: { ...f.scope, ...patch } });
    expect((view.getByRole('textbox') as HTMLInputElement).value).toBe('');
    expect(f.unavailable).not.toHaveBeenCalled();
  });
  it('preserves draft and input identity for a presentation-only change', async () => {
    const f = fixture(); const view = render(Host, { action, scope: f.scope });
    const input = view.getByRole('textbox') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Still here' } });
    await view.rerender({ title: 'New heading' });
    expect(view.getByRole('textbox')).toBe(input); expect(input.value).toBe('Still here');
  });
  it('uses unique field and heading IDs across surfaces with repeated widget IDs', () => {
    const f = fixture();
    const first = render(Host, { action, scope: f.scope }), second = render(Host, { action, scope: f.scope });
    const nodes = [...first.container.querySelectorAll('[id]'), ...second.container.querySelectorAll('[id]')];
    const ids = nodes.map(node => node.id);
    expect(ids.length).toBeGreaterThanOrEqual(4); expect(new Set(ids).size).toBe(ids.length);
  });
});
