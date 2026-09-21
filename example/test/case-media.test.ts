// @vitest-environment happy-dom
import { mount, tick, unmount } from 'svelte';
import { afterEach, expect, it, vi } from 'vitest';
import { requireValue } from '../../scripts/test-assertions';
import CaseWorkspacePage from '../src/pages/CaseWorkspacePage.svelte';

vi.mock('@svadmin/core/i18n', () => ({
  useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}));

let mounted: ReturnType<typeof mount> | undefined;
let target: HTMLDivElement;
afterEach(async () => {
  if (mounted) await unmount(mounted);
  target?.remove();
  vi.restoreAllMocks();
});

it('keeps case flow and delegates local image loading, failure and recovery to shared media', async () => {
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  target = document.createElement('div');
  document.body.append(target);
  mounted = mount(CaseWorkspacePage, { target });
  await tick();
  const click = async (label: string) => {
    const button = requireValue([...target.querySelectorAll('button')].find(node => node.textContent?.trim() === label));
    button.click();
    await tick();
  };
  expect(target.querySelector('details')?.classList.contains('svadmin-collapsible')).toBe(true);
  await click('Accept case');
  const notes = requireValue(target.querySelector('textarea'));
  expect(notes.getAttribute('rows')).toBe('6');
  notes.value = 'Optical examination completed';
  notes.dispatchEvent(new Event('input', { bubbles: true }));
  await tick();
  await click('Submit execution record');
  expect(target.textContent).toContain('Evidence is required before proceeding to the report.');
  const input = requireValue(target.querySelector<HTMLInputElement>('input[type="file"]'));
  const choose = async (name: string) => {
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['image'], name, { type: 'image/png' })] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
  };
  await choose('first.png');
  const media = () => target.querySelector('[data-slot="media-thumbnail"]');
  expect(media()?.getAttribute('data-media-state')).toBe('loading');
  expect(target.querySelector('[role="status"][aria-label="Loading local evidence"]')).not.toBeNull();
  requireValue(target.querySelector('img')).dispatchEvent(new Event('error'));
  await tick();
  expect(media()?.getAttribute('data-media-state')).toBe('error');
  expect(target.textContent).toContain('Image unavailable. Choose a valid image again.');
  await choose('second.png');
  expect(revoke).toHaveBeenCalledWith('blob:first');
  expect(media()?.getAttribute('data-media-state')).toBe('loading');
  requireValue(target.querySelector('img')).dispatchEvent(new Event('load'));
  await tick();
  expect(media()?.getAttribute('data-media-state')).toBe('loaded');
  expect(create).toHaveBeenCalledTimes(2);
  await unmount(mounted);
  mounted = undefined;
  expect(revoke).toHaveBeenCalledWith('blob:second');
});
