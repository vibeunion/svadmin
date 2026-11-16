import { describe, expect, test } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const workflow = Bun.YAML.parse(
  readFileSync(resolve(import.meta.dir, '../.github/workflows/ci.yml'), 'utf8'),
) as { jobs: { publish: { steps: Array<{ name?: string; run?: string }> } } };
function publicationScript(): string {
  const publishScript = workflow.jobs.publish.steps.find(
    (step) => step.name === 'Publish released packages',
  )?.run;
  if (!publishScript) throw new Error('Missing publication step');
  return publishScript;
}

interface PublicationScenario {
  registryStatus?: string;
  publishError?: string;
  omitFirstManifest?: boolean;
  scaffoldDependency?: boolean;
  uiRegistryStatusAfterPublish?: string;
}

function runPublication(scenario: PublicationScenario) {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-publish-execution-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const packageDirectories = scenario.scaffoldDependency
    ? ['ui', 'create-svadmin', 'independent']
    : ['first', 'second'];
  const firstDirectory = packageDirectories[0];
  if (!firstDirectory) throw new Error('Missing first publication package');
  for (const name of packageDirectories) {
    mkdirSync(join(root, 'packages', name), { recursive: true });
    if (name === firstDirectory && scenario.omitFirstManifest) continue;
    writeFileSync(
      join(root, 'packages', name, 'package.json'),
      JSON.stringify({ name: name === 'create-svadmin' ? '@svadmin/create' : `@svadmin/${name}`, version: '1.0.0' }),
    );
  }
  writeFileSync(join(bin, 'bun'), `#!/bin/bash
if [ "$2" = "$PUBLICATION_FIRST_NAME" ]; then
  publication_registry_status="$REGISTRY_STATUS"
  if [ "$PUBLICATION_SCAFFOLD_DEPENDENCY" = "true" ] && [ -f "$PUBLICATION_UI_READY" ]; then
    publication_registry_status="$PUBLICATION_UI_STATUS_AFTER"
  fi
  [ "$publication_registry_status" = "error" ] && exit 1
  printf '%s\\n' "$publication_registry_status"
else
  echo missing
fi
`, { mode: 0o755 });
  writeFileSync(join(bin, 'npm'), `#!/bin/bash
printf '%s %s\\n' "\${PWD##*/}" "$*" >> "$ATTEMPTS"
if [ "\${PWD##*/}" = "$PUBLICATION_FIRST_DIR" ]; then
  if [ -n "$PUBLISH_ERROR" ]; then
    echo "$PUBLISH_ERROR"
    exit 1
  fi
  touch "$PUBLICATION_UI_READY"
fi
`, { mode: 0o755 });
  try {
    const execution = spawnSync('bash', ['-c', publicationScript()], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        RELEASE_DIRS: packageDirectories.map((name) => `packages/${name}`).join('\n'),
        RUNNER_TEMP: root,
        ATTEMPTS: join(root, 'attempts'),
        REGISTRY_STATUS: scenario.registryStatus ?? 'missing',
        PUBLISH_ERROR: scenario.publishError ?? '',
        PUBLICATION_FIRST_DIR: firstDirectory,
        PUBLICATION_FIRST_NAME: `@svadmin/${firstDirectory}`,
        PUBLICATION_SCAFFOLD_DEPENDENCY: String(scenario.scaffoldDependency ?? false),
        PUBLICATION_UI_READY: join(root, 'ui-published'),
        PUBLICATION_UI_STATUS_AFTER: scenario.uiRegistryStatusAfterPublish ?? 'published',
        // 即使存在旧配置，OIDC 失败也不能使用它进行第二次发布。
        NPM_BOOTSTRAP_TOKEN: 'test-only-unused-token',
      },
    });
    if (execution.error) throw execution.error;
    return {
      status: execution.status,
      output: execution.stdout + execution.stderr,
      attempts: readFileSync(join(root, 'attempts'), 'utf8').trim().split('\n'),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('release publication shell execution', () => {
  test('restores trusted verifiers while validating historical package metadata', () => {
    const root = mkdtempSync(join(tmpdir(), 'svadmin-historical-release-'));
    const git = (...args: string[]) => execFileSync('git', [
      '-c', 'user.name=Release Test',
      '-c', 'user.email=release-test@example.invalid',
      ...args,
    ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const manifestPath = join(root, 'packages', 'lite', 'package.json');
    try {
      mkdirSync(join(root, 'packages', 'lite'), { recursive: true });
      writeFileSync(join(root, 'release-please-config.json'), JSON.stringify({
        packages: { 'packages/lite': { component: 'lite' } },
      }));
      writeFileSync(manifestPath, JSON.stringify({ name: '@svadmin/lite', version: '0.1.0' }));
      git('init');
      git('add', '.');
      git('commit', '--no-verify', '-m', 'historical release');
      const releaseSha = git('rev-parse', 'HEAD');
      git('tag', 'lite-v0.1.0');
      mkdirSync(join(root, 'scripts'));
      for (const filename of [
        'verify-workspace-lockfile.ts',
        'plan-release-publication.ts',
        'verify-release-manifest.ts',
        'npm-package-version.ts',
      ]) {
        writeFileSync(join(root, 'scripts', filename),
          readFileSync(resolve(import.meta.dir, filename), 'utf8'));
      }
      writeFileSync(manifestPath, JSON.stringify({ name: '@svadmin/lite', version: '0.2.0' }));
      git('add', '.');
      git('commit', '--no-verify', '-m', 'current workflow revision');
      const verifierSha = git('rev-parse', 'HEAD');
      git('remote', 'add', 'origin', root);
      git('checkout', '--detach', releaseSha);
      const restore = workflow.jobs.publish.steps.find(
        (step) => step.name === 'Use workflow revision publication verifiers',
      )?.run;
      if (!restore) throw new Error('Missing trusted verifier restoration');
      execFileSync('bash', ['-e', '-c', restore], {
        cwd: root,
        env: { ...process.env, VERIFIER_SHA: verifierSha },
        stdio: 'pipe',
      });
      const verification = spawnSync(process.execPath, ['scripts/verify-release-manifest.ts'], {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          RELEASE_SHA: releaseSha,
          RELEASE_MANIFEST: '[{"path":"packages/lite","tag":"lite-v0.1.0"}]',
        },
      });
      expect(verification.status).toBe(0);
      expect(verification.stdout).toContain(`Verified 1 release tag(s) at ${releaseSha}`);
      expect(JSON.parse(readFileSync(manifestPath, 'utf8')).version).toBe('0.1.0');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  test('fails OIDC errors without token retry while continuing the remaining batch', () => {
    for (const publishError of ['E404', 'E401', 'E403', 'E500']) {
      const execution = runPublication({ publishError });
      expect(execution.status).toBe(1);
      expect(execution.attempts).toEqual([
        'first publish --provenance --access public',
        'second publish --provenance --access public',
      ]);
      expect(execution.output).toContain('One or more release packages failed to publish');
    }
  }, 30_000);

  test('accepts successful publication and skips already published exact versions', () => {
    const successful = runPublication({});
    expect(successful.status).toBe(0);
    expect(successful.attempts).toHaveLength(2);
    const existing = runPublication({ registryStatus: 'published' });
    expect(existing.status).toBe(0);
    expect(existing.attempts).toEqual(['second publish --provenance --access public']);
  }, 30_000);

  test('blocks scaffold publication until its UI dependency is registry-visible while retaining independent packages', () => {
    for (const scenario of [
      { publishError: 'E403' },
      { uiRegistryStatusAfterPublish: 'missing' },
      { uiRegistryStatusAfterPublish: 'error' },
    ]) {
      const execution = runPublication({ scaffoldDependency: true, ...scenario });
      expect(execution.status).toBe(1);
      expect(execution.attempts).toEqual([
        'ui publish --provenance --access public',
        'independent publish --provenance --access public',
      ]);
      expect(execution.output).toContain('required @svadmin/ui@1.0.0');
    }
  }, 30_000);

  test('publishes scaffolds after UI becomes visible and accepts an already published UI on retry', () => {
    const successful = runPublication({ scaffoldDependency: true });
    expect(successful.status).toBe(0);
    expect(successful.attempts).toEqual([
      'ui publish --provenance --access public',
      'create-svadmin publish --provenance --access public',
      'independent publish --provenance --access public',
    ]);
    const existing = runPublication({ scaffoldDependency: true, registryStatus: 'published' });
    expect(existing.status).toBe(0);
    expect(existing.attempts).toEqual([
      'create-svadmin publish --provenance --access public',
      'independent publish --provenance --access public',
    ]);
  }, 30_000);

  test('fails registry errors, unexpected statuses and missing manifests without losing later packages', () => {
    for (const scenario of [
      { registryStatus: 'error' },
      { registryStatus: 'unexpected' },
      { omitFirstManifest: true },
    ]) {
      const execution = runPublication(scenario);
      expect(execution.status).toBe(1);
      expect(execution.attempts).toEqual(['second publish --provenance --access public']);
      expect(execution.output).toContain('One or more release packages failed to publish');
    }
  }, 30_000);
});
