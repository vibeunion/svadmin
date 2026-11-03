import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compile } from 'svelte/compiler';
import { planSwizzle, SWIZZLE_CATALOG } from './swizzle-command';

describe('svadmin swizzle', () => {
  it('lists components in SWIZZLE_CATALOG', () => {
    expect(SWIZZLE_CATALOG.length).toBeGreaterThanOrEqual(5);
    const names = SWIZZLE_CATALOG.map((c) => c.name);
    expect(names).toContain('AutoTable');
    expect(names).toContain('AutoForm');
    expect(names).toContain('ModalForm');
    expect(names).toContain('DrawerForm');
    expect(names).toContain('Sidebar');
  });

  it('plans swizzling for a valid component', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svadmin-swizzle-test-'));
    try {
      const plan = planSwizzle({
        component: 'AutoTable',
        projectDirectory: tempDir,
        targetDir: 'src/components/svadmin',
      });

      expect(plan.component).toBe('AutoTable');
      expect(plan.targetFilePath).toBe(path.join(tempDir, 'src/components/svadmin/AutoTable.svelte'));
      expect(plan.exists).toBe(false);
      expect(plan.content).toContain("import { AutoTable as BaseAutoTable } from '@svadmin/ui'");
      expect(() => compile(plan.content, { generate: 'client' })).not.toThrow();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('throws an error for an unknown component', () => {
    expect(() => planSwizzle({ component: 'NonExistent' })).toThrow(
      'Unknown component "NonExistent"',
    );
  });
});
