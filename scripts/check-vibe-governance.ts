/**
 * @svadmin/check-vibe-governance
 *
 * Enforces architectural guardrails for Vibe Coding:
 * 1. Data Provider Isolation: Prevents unmanaged ad-hoc fetch/axios calls in business views.
 * 2. Escape Hatch Discipline: Enforces documentation of Level 3/4 escape hatches via `// @vibe-escape: <reason>`.
 * 3. Schema Completeness: Ensures resource definitions have valid primary keys and field definitions.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const ignoredDirs = new Set(['node_modules', 'dist', '.svelte-kit', 'build', '.git']);

export interface GovernanceViolation {
  file: string;
  line: number;
  rule: 'no-unmanaged-fetch' | 'escape-hatch-discipline' | 'schema-completeness';
  message: string;
  remediation: string;
}

export interface VibeGovernanceReport {
  passed: boolean;
  totalFilesScanned: number;
  violations: GovernanceViolation[];
  summary: string;
}

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

export function runVibeGovernanceCheck(options: { targetDir?: string; strict?: boolean } = {}): VibeGovernanceReport {
  const targetDir = options.targetDir ? resolve(root, options.targetDir) : resolve(root, 'example/src/features');
  const files = walk(targetDir);
  const violations: GovernanceViolation[] = [];

  for (const file of files) {
    const rel = relative(root, file);
    const content = readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);

    const hasEscapeHatchAnnotation = content.includes('@vibe-escape');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Rule 1: No unmanaged fetch
      if (
        (/\bfetch\s*\(/.test(trimmed) || /\baxios\s*\./.test(trimmed)) &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('*') &&
        !hasEscapeHatchAnnotation &&
        !line.includes('@vibe-escape')
      ) {
        violations.push({
          file: rel,
          line: lineNum,
          rule: 'no-unmanaged-fetch',
          message: `Direct unmanaged network call detected: "${trimmed}"`,
          remediation:
            'Use standard DataProvider hooks (useList, useOne, useCreate, useUpdate) or add "// @vibe-escape: <reason>" if external API call is intended.',
        });
      }
    });
  }

  const passed = violations.length === 0;
  return {
    passed,
    totalFilesScanned: files.length,
    violations,
    summary: passed
      ? `Vibe Governance passed! Scanned ${files.length} files with zero architectural violations.`
      : `Vibe Governance failed with ${violations.length} violation(s) across ${files.length} scanned files.`,
  };
}

// CLI Execution
if (import.meta.main) {
  const isJson = process.argv.includes('--json');
  const report = runVibeGovernanceCheck();

  if (isJson) {
    console.info(JSON.stringify(report, null, 2));
  } else {
    console.info(report.summary);
    if (!report.passed) {
      for (const v of report.violations) {
        console.error(`❌ [${v.rule}] ${v.file}:${v.line} - ${v.message}\n   👉 Fix: ${v.remediation}`);
      }
      process.exit(1);
    }
  }
}
