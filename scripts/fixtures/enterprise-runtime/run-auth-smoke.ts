import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// 只操作本次随机项目；凭据不写文件，也不传递给测试进程。
const root = fileURLToPath(new URL('../../../', import.meta.url));
const project = `svadmin-auth-smoke-${randomUUID()}`;
const env = {
  ...process.env,
  COMPOSE_DISABLE_ENV_FILE: '1',
  SVADMIN_AUTH_DB_PASSWORD: randomBytes(24).toString('hex'),
  SVADMIN_AUTH_JWT_SECRET: randomBytes(32).toString('hex'),
};
const composeArgs = [
  '--context', 'orbstack', 'compose', '--env-file', '/dev/null',
  '-p', project, '-f', 'docker/enterprise-test/auth-compose.yml',
];

function compose(args: string[], timeout = 120_000): string {
  const result = spawnSync('docker', [...composeArgs, ...args], {
    cwd: root, env, encoding: 'utf8', timeout, maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    const secret = env.SVADMIN_AUTH_JWT_SECRET;
    const password = env.SVADMIN_AUTH_DB_PASSWORD;
    const detail = `${result.stderr ?? ''}\n${result.stdout ?? ''}`
      .replaceAll(secret, '[redacted]')
      .replaceAll(password, '[redacted]')
      .trim()
      .split('\n')
      .slice(-8)
      .join('\n');
    throw new Error(`Compose ${args[0]} failed (${result.status ?? 'timeout/spawn'}).\n${detail}`);
  }
  return result.stdout.trim();
}

let cleaning = false;
function cleanup(): void {
  if (cleaning) return;
  cleaning = true;
  try {
    compose(['down', '-v', '--remove-orphans', '--timeout', '5'], 60_000);
    console.info(`Cleaned ${project}`);
  } finally { cleaning = false; }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    try { cleanup(); } catch { console.error(`Cleanup failed for ${project}.`); }
    process.exit(signal === 'SIGINT' ? 130 : 143);
  });
}

let status = 1;
try {
  console.info(`Starting ${project} on local OrbStack`);
  compose(['up', '-d', '--pull', 'never', '--wait', '--wait-timeout', '60', 'auth-db']);
  compose(['exec', '-T', 'auth-db', 'psql', '-U', 'postgres', '-d', 'svadmin_auth',
    '-v', 'ON_ERROR_STOP=1', '-c', 'CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION postgres;', '-c', 'CREATE EXTENSION IF NOT EXISTS pgcrypto;']);
  compose(['up', '-d', '--pull', 'never', '--wait', '--wait-timeout', '60', 'auth']);
  const address = compose(['port', 'auth', '9999']);
  if (!/^127\.0\.0\.1:\d+$/.test(address)) throw new Error('Expected a loopback-only Auth port.');
  const authUrl = `http://${address}`;
  let healthy = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${authUrl}/health`, { signal: AbortSignal.timeout(2000) });
      await response.body?.cancel();
      if (response.ok) { healthy = true; break; }
    } catch { /* 等待独立数据库迁移完成。 */ }
    await Bun.sleep(500);
  }
  if (!healthy) throw new Error('GoTrue health check timed out.');
  console.info('GoTrue healthy; running the single provider integration test');
  const result = spawnSync(process.execPath, [
    'test', 'scripts/fixtures/enterprise-runtime/supabase-auth.test.ts', '--timeout', '30000',
  ], {
    cwd: root,
    env: {
      ...process.env,
      SVADMIN_AUTH_URL: authUrl,
      SVADMIN_AUTH_JWT_SECRET: env.SVADMIN_AUTH_JWT_SECRET,
    },
    encoding: 'utf8', timeout: 90_000, maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    const secret = env.SVADMIN_AUTH_JWT_SECRET;
    const password = env.SVADMIN_AUTH_DB_PASSWORD;
    const redact = (value: string | undefined) => (value ?? '')
      .replaceAll(secret, '[redacted]')
      .replaceAll(password, '[redacted]')
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt]')
      .replace(/[A-Za-z0-9._%+-]+@example\.test/g, '[email]');
    console.error(redact(result.stdout));
    console.error(redact(result.stderr));
    try {
      console.error(redact(compose(['logs', '--no-color', '--tail', '20', 'auth'])));
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Could not read Auth logs.');
    }
    console.error('Auth integration failed.');
  } else {
    console.info(result.stdout);
    console.info(result.stderr);
    status = 0;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Auth smoke failed.');
} finally {
  try { cleanup(); } catch { console.error(`Cleanup failed for ${project}.`); status = 1; }
}
process.exitCode = status;
