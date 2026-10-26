import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// 只操作本次随机项目；临时凭据只经环境传给容器和定向测试。
const root = fileURLToPath(new URL('../../../', import.meta.url));
const project = `svadmin-storage-smoke-${randomUUID()}`;
const env = {
  ...process.env,
  COMPOSE_DISABLE_ENV_FILE: '1',
  SVADMIN_STORAGE_DB_PASSWORD: randomBytes(24).toString('hex'),
  SVADMIN_STORAGE_JWT_SECRET: randomBytes(32).toString('hex'),
};
const composeArgs = [
  '--context', 'orbstack', 'compose', '--env-file', '/dev/null',
  '-p', project, '-f', 'docker/enterprise-test/storage-compose.yml',
];

function compose(args: string[], timeout = 120_000): string {
  const result = spawnSync('docker', [...composeArgs, ...args], {
    cwd: root, env, encoding: 'utf8', timeout, maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    const detail = `${result.stderr ?? ''}\n${result.stdout ?? ''}`
      .replaceAll(env.SVADMIN_STORAGE_JWT_SECRET, '[redacted]')
      .replaceAll(env.SVADMIN_STORAGE_DB_PASSWORD, '[redacted]')
      .trim()
      .split('\n')
      .slice(-12)
      .join('\n');
    throw new Error(`Compose ${args[0]} failed (${result.status ?? 'timeout/spawn'}).\n${detail}`);
  }
  return result.stdout.trim();
}

function cleanup(): void {
  try {
    compose(['down', '-v', '--remove-orphans', '--timeout', '5'], 60_000);
    console.info(`Cleaned ${project}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : `Cleanup failed for ${project}.`);
  }
}

function loopbackPort(service: string, containerPort: string): string {
  const address = compose(['port', service, containerPort]);
  if (!/^127\.0\.0\.1:\d+$/.test(address)) throw new Error(`Expected a loopback port for ${service}.`);
  return `http://${address}`;
}

async function waitFor(url: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      await response.body?.cancel();
      if (response.ok) return;
    } catch {
      // 等待迁移或角色初始化完成。
    }
    await Bun.sleep(500);
  }
  throw new Error(`Service did not become healthy: ${url}`);
}

let status = 1;
try {
  console.info(`Starting ${project} on local OrbStack`);
  compose(['up', '-d', '--pull', 'never', '--wait', '--wait-timeout', '90', 'db']);
  compose(['exec', '-T', 'db', 'psql', '-U', 'postgres', '-d', 'storage', '-v', 'ON_ERROR_STOP=1', '-c', `
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN;
    CREATE ROLE web NOLOGIN;
    GRANT USAGE ON SCHEMA public TO web;
    CREATE TABLE public.record_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      resource text NOT NULL,
      record_id text NOT NULL,
      version integer NOT NULL,
      title text,
      snapshot jsonb NOT NULL,
      UNIQUE (resource, record_id, version)
    );
    GRANT SELECT, INSERT, DELETE ON public.record_versions TO web;
  `]);
  compose(['up', '-d', '--pull', 'never', '--wait', '--wait-timeout', '90', 'storage', 'versions']);
  const storageUrl = loopbackPort('storage', '5000');
  const versionUrl = loopbackPort('versions', '3000');
  await waitFor(`${storageUrl}/status`);
  await waitFor(`${versionUrl}/`);
  compose(['exec', '-T', 'db', 'psql', '-U', 'postgres', '-d', 'storage', '-v', 'ON_ERROR_STOP=1', '-c', `
    ALTER ROLE service_role BYPASSRLS;
    GRANT USAGE ON SCHEMA storage TO service_role;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA storage TO service_role;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA storage TO service_role;
    GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA storage TO service_role;
  `]);
  const result = spawnSync(process.execPath, [
    'test',
    'scripts/fixtures/enterprise-runtime/storage-object.test.ts',
    'scripts/fixtures/enterprise-runtime/record-version.test.ts',
    '--timeout', '30000',
  ], {
    cwd: root,
    env: {
      ...process.env,
      SVADMIN_STORAGE_SMOKE_RUN: project,
      SVADMIN_STORAGE_URL: storageUrl,
      SVADMIN_VERSION_URL: versionUrl,
      SVADMIN_STORAGE_JWT_SECRET: env.SVADMIN_STORAGE_JWT_SECRET,
    },
    encoding: 'utf8',
    timeout: 90_000,
    maxBuffer: 1024 * 1024,
  });
  const secret = env.SVADMIN_STORAGE_JWT_SECRET;
  const password = env.SVADMIN_STORAGE_DB_PASSWORD;
  const redact = (value: string | undefined) => (value ?? '')
    .replaceAll(secret, '[redacted]')
    .replaceAll(password, '[redacted]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt]');
  if (result.error || result.status !== 0) {
    console.error(redact(result.stdout));
    console.error(redact(result.stderr));
    console.error('Storage and version smoke failed.');
  } else {
    console.info(redact(`${result.stdout}\n${result.stderr}`));
    if (!result.stderr.includes('(pass)') || result.stderr.includes('(fail)') || result.stderr.includes('(skip)')) {
      console.error('Storage and version smoke did not report two passing tests.');
    } else {
      status = 0;
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Storage smoke failed.');
  try {
    const logs = compose(['logs', '--no-color', '--tail', '30', 'storage']);
    console.error(logs
      .replaceAll(env.SVADMIN_STORAGE_JWT_SECRET, '[redacted]')
      .replaceAll(env.SVADMIN_STORAGE_DB_PASSWORD, '[redacted]'));
  } catch {
    console.error('Storage logs were unavailable.');
  }
} finally {
  cleanup();
}
process.exitCode = status;
