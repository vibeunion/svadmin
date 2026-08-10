import { spawnSync } from 'node:child_process';

export type NpmPackageVersionStatus = 'published' | 'missing';

interface NpmViewCommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

interface NpmPackageVersionStatusOptions {
  name: string;
  version: string;
  runNpmView?: (name: string, version: string) => NpmViewCommandResult;
}

function runNpmView(name: string, version: string): NpmViewCommandResult {
  const commandResult = spawnSync('npm', ['view', `${name}@${version}`, 'version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  });
  return {
    status: commandResult.status,
    stdout: commandResult.stdout,
    stderr: commandResult.stderr,
    error: commandResult.error,
  };
}

export function npmPackageVersionStatus({
  name,
  version,
  runNpmView: executeNpmView = runNpmView,
}: NpmPackageVersionStatusOptions): NpmPackageVersionStatus {
  const commandResult = executeNpmView(name, version);
  if (commandResult.error) {
    throw new Error(`npm registry lookup could not start for ${name}@${version}`, {
      cause: commandResult.error,
    });
  }
  if (commandResult.status === 0) {
    const publishedVersion = commandResult.stdout.trim();
    if (publishedVersion !== version) {
      throw new Error(`npm returned ${publishedVersion || 'no version'} for ${name}, expected ${version}`);
    }
    return 'published';
  }
  if (/\bE404\b/.test(commandResult.stderr)) return 'missing';
  throw new Error(`npm registry lookup failed for ${name}@${version} (exit ${String(commandResult.status)})`);
}

if (import.meta.main) {
  try {
    const name = process.argv[2];
    const version = process.argv[3];
    if (!name || !version) {
      throw new Error('Usage: bun scripts/npm-package-version.ts <package-name> <version>');
    }
    console.info(npmPackageVersionStatus({ name, version }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
