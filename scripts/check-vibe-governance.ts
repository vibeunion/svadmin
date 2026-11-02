/**
 * @svadmin/check-vibe-governance
 *
 * Enforces architectural guardrails for Vibe Coding:
 * 1. Data Provider Isolation: Prevents unmanaged ad-hoc fetch/axios calls in business views.
 * 2. Escape Hatch Discipline: Enforces documentation of Level 3/4 escape hatches via `// @vibe-escape: <reason>`.
 *
 * The rule engine lives in `@svadmin/mcp` so the CLI gate and the
 * `svadmin_verifyGovernance` MCP tool always report the same verdict.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { scanVibeGovernance, type GovernanceSource, type VibeGovernanceReport } from '@svadmin/mcp';

export type { GovernanceRuleId, GovernanceViolation, VibeGovernanceReport } from '@svadmin/mcp';

const root = resolve(import.meta.dir, '..');
const ignoredDirs = new Set(['node_modules', 'dist', '.svelte-kit', 'build', '.git']);

function walk(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(path));
    } else if (
      ['.ts', '.svelte'].includes(extname(entry.name)) &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.includes('.test.') &&
      !entry.name.includes('.spec.')
    ) {
      files.push(path);
    }
  }
  return files;
}

export interface VibeGovernanceCheckOptions {
  /** Directory (relative to the repository root) to scan; defaults to example/src/features. */
  targetDir?: string;
  /** Require every @vibe-escape annotation to carry a non-empty reason. */
  strict?: boolean;
}

export function runVibeGovernanceCheck(options: VibeGovernanceCheckOptions = {}): VibeGovernanceReport {
  const targetDir = options.targetDir ? resolve(root, options.targetDir) : resolve(root, 'example/src/features');
  const sources: GovernanceSource[] = walk(targetDir).map(file => ({
    path: relative(root, file),
    content: readFileSync(file, 'utf8'),
  }));

  return scanVibeGovernance(sources, { strict: options.strict ?? false });
}

// CLI Execution
if (import.meta.main) {
  const isJson = process.argv.includes('--json');
  const strict = process.argv.includes('--strict');
  const report = runVibeGovernanceCheck({ strict });

  if (isJson) {
    console.info(JSON.stringify(report, null, 2));
  } else {
    console.info(report.summary);
  }

  if (!report.passed) {
    for (const v of report.violations) {
      console.error(`[${v.rule}] ${v.file}:${v.line} - ${v.message}\n  Fix: ${v.remediation}`);
    }
    process.exit(1);
  }
}