import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import EnvVariableEditor from './EnvVariableEditor.svelte';

describe('EnvVariableEditor suite', () => {
  it('renders environment variables and allows masking/unmasking', async () => {
    const view = render(EnvVariableEditor, {
      initialVariables: [
        { key: 'API_SECRET', value: 'secret-123', isSecret: true },
      ],
    });

    expect(view.container.querySelectorAll('tbody tr').length).toBe(1);
    const eyeBtn = view.container.querySelector('button[aria-label="Reveal secret"]');
    expect(eyeBtn).toBeTruthy();
    if (eyeBtn) {
      await fireEvent.click(eyeBtn);
      expect(view.container.querySelector('button[aria-label="Hide secret"]')).toBeTruthy();
    }
  });

  it('triggers onSaveEnv when saving configuration', async () => {
    const onSaveEnv = vi.fn();
    const view = render(EnvVariableEditor, {
      initialVariables: [{ key: 'PORT', value: '8080' }],
      onSaveEnv,
    });

    const saveBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('保存') || b.textContent?.includes('Save'),
    );
    expect(saveBtn).toBeTruthy();
    if (saveBtn) {
      await fireEvent.click(saveBtn);
      expect(onSaveEnv).toHaveBeenCalledWith(
        expect.objectContaining({ PORT: '8080' }),
        'production',
      );
    }
  });
});
