import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageRoot = resolve(import.meta.dir, '..');
const repositoryRoot = resolve(packageRoot, '../..');
const rootDesignPath = resolve(repositoryRoot, 'DESIGN.md');
const guidanceDesignPath = resolve(packageRoot, 'guidance/DESIGN.md');
const guidanceAgentsPath = resolve(packageRoot, 'guidance/AGENTS.md');

describe('create-svadmin AI guidance contract', () => {
  it('ships the project design and agent guidance files', () => {
    expect(existsSync(guidanceDesignPath)).toBe(true);
    expect(existsSync(guidanceAgentsPath)).toBe(true);
  });

  it('keeps the shipped DESIGN.md synchronized with the repository source', () => {
    expect(readFileSync(guidanceDesignPath, 'utf8')).toBe(readFileSync(rootDesignPath, 'utf8'));
  });

  it('makes feedback ownership and information budget executable for AI', () => {
    const agents = readFileSync(guidanceAgentsPath, 'utf8');
    expect(agents).toContain('Read `DESIGN.md` before');
    expect(agents).toContain('one event -> one primary feedback surface');
    expect(agents).toContain('at most one full-width high-emphasis notice');
    expect(agents).toContain('successNotification: false');
  });
});
