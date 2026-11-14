import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appCss = readFileSync(resolve(uiRoot, 'src/app.css'), 'utf8');
const modalForm = readFileSync(resolve(uiRoot, 'src/components/ModalForm.svelte'), 'utf8');
const toastHost = readFileSync(resolve(uiRoot, 'src/components/Toast.svelte'), 'utf8');
const autoTable = readFileSync(resolve(uiRoot, 'src/components/AutoTable.svelte'), 'utf8');

describe('interaction contract', () => {
  it('keeps popconfirm within 320px and dialog sizes at 400/520/720', () => {
    expect(appCss).toContain('.svadmin-popconfirm { display: grid; gap: 0.75rem; width: max-content; max-width: 20rem; }');
    expect(appCss).toContain('.svadmin-dialog-content[data-dialog-size="sm"] { max-width: min(400px, calc(100% - 2rem)); }');
    expect(appCss).toContain('.svadmin-dialog-content[data-dialog-size="md"] { max-width: min(520px, calc(100% - 2rem)); }');
    expect(appCss).toContain('.svadmin-dialog-content[data-dialog-size="lg"] { max-width: min(720px, calc(100% - 2rem)); }');
    expect(appCss).toContain('margin-top: 4px;');
  });

  it('keeps form dialogs from closing on the mask and gives message a normal type', () => {
    expect(modalForm).toContain('closeOnOverlayClick={false}');
    expect(modalForm).toContain('size="md"');
    expect(toastHost).toContain("case 'normal'");
    expect(toastHost).toContain("placement === 'top' ? 'top-center'");
  });

  it('gives AutoTable an accessible loading state and an empty state', () => {
    expect(autoTable).toContain('data-svadmin-table-state="loading"');
    expect(autoTable).toContain('aria-busy="true"');
    expect(autoTable).toContain("state={hasCriteria ? 'filtered-empty' : 'empty'}");
  });
});
