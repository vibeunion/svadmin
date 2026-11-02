/**
 * @svadmin/mcp/governance
 *
 * Pure, filesystem-free rule engine for the SVAdmin Vibe Coding governance
 * checks. The MCP tool and `scripts/check-vibe-governance.ts` both delegate to
 * this module so agents and CI enforce exactly the same rules.
 */

export type GovernanceRuleId = 'no-unmanaged-fetch' | 'escape-hatch-discipline';

export interface GovernanceSource {
  /** Path used in reports and error messages */
  path: string;
  /** Full source text of the file */
  content: string;
}

export interface GovernanceViolation {
  file: string;
  line: number;
  rule: GovernanceRuleId;
  message: string;
  remediation: string;
}

export interface VibeGovernanceReport {
  passed: boolean;
  totalFilesScanned: number;
  rulesChecked: GovernanceRuleId[];
  violations: GovernanceViolation[];
  summary: string;
}

export interface VibeGovernanceOptions {
  /**
   * Strict mode: a `@vibe-escape` annotation only suppresses a violation when it
   * carries a non-empty reason. Non-strict mode honours any annotation but still
   * reports annotations that are missing a reason.
   */
  strict?: boolean;
}

const ESCAPE_MARKER = /@vibe-escape\b/u;
const ESCAPE_REASON = /@vibe-escape\s*:\s*(\S.*)$/u;
const COMMENT_PREFIX = /^(?:\/\/|\/\*|\*)/u;
const NETWORK_CALL = [/[^.\w]fetch\s*\(/u, /(?:^|[^.\w])axios\s*[.(]/u];

function escapeSuppression(lines: string[], strict: boolean): boolean {
  for (const line of lines) {
    if (!ESCAPE_MARKER.test(line)) continue;
    if (!strict) return true;
    if (ESCAPE_REASON.test(line)) return true;
  }
  return false;
}

/**
 * Scans in-memory sources for architectural violations.
 *
 * Rules:
 * 1. `no-unmanaged-fetch` — view code must not call `fetch()` / `axios` directly
 *    unless the file documents `// @vibe-escape: <reason>`.
 * 2. `escape-hatch-discipline` — every `@vibe-escape` marker must carry a reason.
 */
export function scanVibeGovernance(
  sources: GovernanceSource[],
  options: VibeGovernanceOptions = {},
): VibeGovernanceReport {
  const strict = options.strict ?? false;
  const violations: GovernanceViolation[] = [];

  for (const source of sources) {
    const lines = source.content.split(/\r?\n/u);
    const suppressed = escapeSuppression(lines, strict);

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      if (ESCAPE_MARKER.test(line) && !ESCAPE_REASON.test(line)) {
        violations.push({
          file: source.path,
          line: lineNumber,
          rule: 'escape-hatch-discipline',
          message: `Escape hatch annotation is missing a reason: "${trimmed}"`,
          remediation: 'Use "// @vibe-escape: <reason>" so reviewers and agents can justify the bypass.',
        });
      }

      if (suppressed) return;
      if (COMMENT_PREFIX.test(trimmed)) return;
      if (ESCAPE_MARKER.test(line)) return;
      if (!NETWORK_CALL.some(pattern => pattern.test(line))) return;

      violations.push({
        file: source.path,
        line: lineNumber,
        rule: 'no-unmanaged-fetch',
        message: `Direct unmanaged network call detected: "${trimmed}"`,
        remediation:
          'Use standard DataProvider hooks (useList, useOne, useCreate, useUpdate) or add "// @vibe-escape: <reason>" if an external API call is intended.',
      });
    });
  }

  const passed = violations.length === 0;
  return {
    passed,
    totalFilesScanned: sources.length,
    rulesChecked: ['no-unmanaged-fetch', 'escape-hatch-discipline'],
    violations,
    summary: passed
      ? `Vibe Governance passed! Scanned ${sources.length} files with zero architectural violations.`
      : `Vibe Governance failed with ${violations.length} violation(s) across ${sources.length} scanned files.`,
  };
}