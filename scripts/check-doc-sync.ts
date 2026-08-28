import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface DocSyncIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export interface DocSyncReport {
  readonly ok: boolean;
  readonly issues: readonly DocSyncIssue[];
  readonly scannedPackages: readonly string[];
}

export async function checkDocSync(repositoryRoot: string): Promise<DocSyncReport> {
  const issues: DocSyncIssue[] = [];
  const scannedPackages: string[] = [];

  const rootReadmePath = join(repositoryRoot, 'README.md');
  const rootReadme = await readFile(rootReadmePath, 'utf8');
  const packagesDir = join(repositoryRoot, 'packages');
  const packageNames = await readdir(packagesDir, { withFileTypes: true });

  for (const entry of packageNames) {
    if (!entry.isDirectory()) continue;
    const pkgDir = join(packagesDir, entry.name);
    const pkgJsonPath = join(pkgDir, 'package.json');

    let pkgJson: Record<string, unknown>;
    try {
      pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf8'));
    } catch {
      continue; // skip non-node directories
    }

    const pkgName = String(pkgJson.name ?? '');
    scannedPackages.push(pkgName);

    // 1. Verify license
    if (pkgJson.license !== 'MIT') {
      issues.push({
        path: pkgJsonPath,
        code: 'invalid_license',
        message: `Package ${pkgName} must have license "MIT", found "${String(pkgJson.license)}"`,
      });
    }

    // 2. Verify presence in root README
    if (pkgName && !rootReadme.includes(pkgName)) {
      issues.push({
        path: rootReadmePath,
        code: 'missing_readme_package',
        message: `Package ${pkgName} is not listed in root README.md`,
      });
    }
  }

  // 3. Check surface compatibility line
  const surfaceCompatibilityPath = join(packagesDir, 'surface', 'compatibility.json');
  try {
    const surfaceCompat = JSON.parse(await readFile(surfaceCompatibilityPath, 'utf8'));
    const surfacePkg = JSON.parse(await readFile(join(packagesDir, 'surface', 'package.json'), 'utf8'));
    const expectedLine = `${surfacePkg.version.split('.').slice(0, 2).join('.')}.x`;
    if (surfaceCompat.surface !== expectedLine) {
      issues.push({
        path: surfaceCompatibilityPath,
        code: 'surface_compat_drift',
        message: `Surface compatibility line "${surfaceCompat.surface}" does not match package version "${expectedLine}"`,
      });
    }
  } catch {
    // optional check if file exists
  }

  return {
    ok: issues.length === 0,
    issues,
    scannedPackages,
  };
}

if (import.meta.main) {
  const repoRoot = resolve(import.meta.dir, '..');
  const report = await checkDocSync(repoRoot);
  if (!report.ok) {
    console.error('Doc-Sync verification failed with issues:');
    for (const issue of report.issues) {
      console.error(`- [${issue.code}] ${issue.path}: ${issue.message}`);
    }
    process.exit(1);
  } else {
    console.info(`Doc-Sync verified ${report.scannedPackages.length} packages cleanly.`);
  }
}
