import { createRawSnippet } from 'svelte';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import ModelSelectorHost from './ModelSelector.test-host.svelte';
import ModelSelectorDialog from './ModelSelectorDialog.svelte';
import * as ModelSelectorExports from './index.js';

afterEach(cleanup);

describe('ModelSelector', () => {
  it('exports the complete official runtime surface', () => {
    expect(Object.keys(ModelSelectorExports)).toEqual(expect.arrayContaining([
      'ModelSelector', 'ModelSelectorTrigger', 'ModelSelectorContent', 'ModelSelectorDialog',
      'ModelSelectorInput', 'ModelSelectorList', 'ModelSelectorEmpty', 'ModelSelectorGroup',
      'ModelSelectorItem', 'ModelSelectorShortcut', 'ModelSelectorSeparator', 'ModelSelectorLogo',
      'ModelSelectorLogoGroup', 'ModelSelectorName',
    ]));
  });

  it('supports the standalone dialog export', async () => {
    const children = createRawSnippet(() => ({ render: () => '<p>Standalone model selector</p>' }));
    const view = render(ModelSelectorDialog, { defaultOpen: true, children });

    expect(view.getByRole('dialog', { name: 'Model Selector' })).not.toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Close model selector' }));
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
  });

  it('keeps the data-driven API and selects with arrow keys and Enter', async () => {
    const view = render(ModelSelectorHost);
    const trigger = view.getByRole('button', { name: 'Data model: GPT-4o' });

    await fireEvent.click(trigger);
    const dialog = view.getByRole('dialog', { name: 'Data model' });
    const input = view.getByRole('combobox', { name: 'Search models' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(input);

    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(view.queryByRole('dialog', { name: 'Data model' })).toBeNull());
    expect(view.getByRole('status', { name: 'Data model value' }).textContent).toBe('claude-sonnet');
    expect(document.activeElement).toBe(trigger);
  });

  it('filters compound items and selects the active result', async () => {
    const view = render(ModelSelectorHost);
    const trigger = view.getByRole('button', { name: 'Choose compound model' });

    await fireEvent.click(trigger);
    const input = view.getByRole('combobox', { name: 'Find a model' });
    await fireEvent.input(input, { target: { value: 'Claude' } });

    expect(view.getByRole('option', { name: /Claude Sonnet/ })).not.toBeNull();
    expect(view.queryByRole('option', { name: /GPT-4o/ })).toBeNull();
    await fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(view.queryByRole('dialog', { name: 'Compound models' })).toBeNull());
    expect(view.getByRole('status', { name: 'Compound model value' }).textContent).toBe('claude-sonnet');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on Escape and restores focus to the compound trigger', async () => {
    const view = render(ModelSelectorHost);
    const trigger = view.getByRole('button', { name: 'Choose compound model' });

    await fireEvent.click(trigger);
    const input = view.getByRole('combobox', { name: 'Find a model' });
    await fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => expect(view.queryByRole('dialog', { name: 'Compound models' })).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
});
