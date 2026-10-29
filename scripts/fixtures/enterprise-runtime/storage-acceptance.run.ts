import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SignJWT } from 'jose';
import {
  acceptanceTestNames,
  formatSafeFailureDiagnostics,
  summarizeSafeFailures,
} from './storage-acceptance.diagnostics';

// 只操作本次随机项目；密钥仅存在于进程环境，不写 env 文件，也不落盘。
const root = fileURLToPath(new URL('../../../', import.meta.url));
const fixtureTsconfig = fileURLToPath(new URL('./tsconfig.json', import.meta.url));
const project = `svadmin-auth-storage-smoke-${randomUUID()}`;
const dbPassword = randomBytes(24).toString('hex');
const authDbPassword = randomBytes(24).toString('hex');
const acceptanceDbPassword = randomBytes(24).toString('hex');
const jwtSecret = randomBytes(32).toString('hex');
// 普通用户由测试进程通过真实 GoTrue 注册；runner 不签发用户 JWT，也不把 secret 传给测试。
const marker = 'SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE';
const bucket = 'svadmin-acceptance';
// 保留既有 13 个场景，并新增 1 个真实 ResourceOperationsPage/AutoTable →
// PostgREST/PostgreSQL 查询、详情、快速编辑拒绝与修正保存场景。
const expectedPass = 14;

// Docker context 必须由显式环境参数选择：本地默认 orbstack，CI 传 default。
// 仅允许 default/orbstack，拒绝任意已命名远端 context；也不继承远端 DOCKER_HOST。
const dockerContext = process.env['SVADMIN_STORAGE_DOCKER_CONTEXT'] ?? 'orbstack';
if (dockerContext !== 'default' && dockerContext !== 'orbstack') {
  console.error('Storage 验收失败：stage=config SVADMIN_STORAGE_DOCKER_CONTEXT 仅允许 default/orbstack。');
  process.exit(1);
}

const composeArgs = [
  '--context', dockerContext, 'compose', '--env-file', '/dev/null',
  '-p', project, '-f', 'docker/enterprise-storage/compose.yml',
];

// 子进程环境显式移除 Docker 远端连接变量，只允许 --context 选中本地/CI 引擎。
function composeEnv(extra: Record<string, string> | undefined): Record<string, string | undefined> {
  const env = { ...process.env, ...extra };
  delete env['DOCKER_HOST'];
  delete env['DOCKER_CONTEXT'];
  delete env['DOCKER_TLS_VERIFY'];
  delete env['DOCKER_CERT_PATH'];
  return { ...env, COMPOSE_DISABLE_ENV_FILE: '1' };
}

function compose(args: string[], options: { env?: Record<string, string>; timeout?: number } = {}): string {
  const result = spawnSync('docker', [...composeArgs, ...args], {
    cwd: root,
    env: composeEnv(options.env),
    encoding: 'utf8',
    timeout: options.timeout ?? 120_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    // 不打印原始 compose 输出：失败只给出子命令与退出状态。
    throw new Error(`Compose ${args[0]} failed (${result.status ?? 'timeout/spawn'}).`);
  }
  return result.stdout.trim();
}

function runBrowserBuildStep(label: string, args: string[]): void {
  const result = spawnSync('bun', args, {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${label} build failed (${result.status ?? 'timeout/spawn'}).`);
  }
}

// 浏览器 fixture 的 AdminApp 会经 Layout -> DevTools 导入 @svadmin/devtools，
// 而该包 exports 指向 dist；CI 全新 checkout 没有共享缓存，必须先构建依赖包。
// 同时生成 gitignore 的 tailwind CSS，避免依赖先前手工产物。
function buildBrowserPrerequisites(): void {
  runBrowserBuildStep('devtools-contract', ['run', '--cwd', 'packages/devtools-contract', 'build']);
  runBrowserBuildStep('devtools', ['run', '--cwd', 'packages/devtools', 'build']);
  runBrowserBuildStep('css', ['run', '--cwd', 'packages/ui', 'build:tailwind']);
}

// 只从 Bun 输出提取白名单测试名、固定分类、fixture basename 行列和 engine，
// 不打印原始 output、message、DOM、response 或 trace。
function reportSafeTestFailures(output: string): void {
  try {
    const source = readFileSync(new URL('./storage-acceptance.test.ts', import.meta.url), 'utf8');
    const diagnostics = summarizeSafeFailures(output, acceptanceTestNames(source));
    for (const line of formatSafeFailureDiagnostics(diagnostics)) console.error(line);
  } catch {
    console.error('Storage 验收失败诊断：code=unknown-error');
  }
}

// psql 必须显式拿到本次 stackEnv，不能依赖外部进程环境。
function psql(service: 'storage-db' | 'auth-db', database: string, sql: string, env: Record<string, string>): string {
  return compose([
    'exec', '-T', service, 'psql', '-U', 'postgres', '-d', database,
    '-v', 'ON_ERROR_STOP=1', '-tAc', sql,
  ], { env });
}

async function keyFor(claims: Record<string, unknown>): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(jwtSecret));
}

interface TestCounts { pass: number; fail: number; skip: number; todo: number }

// 只接受显式的 Bun 汇总计数；缺少 pass/fail 时返回 null，不能把未知计数当成通过。
function parseTestCounts(output: string): TestCounts | null {
  const counts: TestCounts = { pass: 0, fail: 0, skip: 0, todo: 0 };
  const seen = new Set<keyof TestCounts>();
  for (const match of output.matchAll(/(\d+)\s+(pass|fail|skip|todo)\b/g)) {
    const name = match[2] as keyof TestCounts;
    const value = Number(match[1]);
    if (!Number.isSafeInteger(value) || seen.has(name)) return null;
    counts[name] = value;
    seen.add(name);
  }
  return seen.has('pass') && seen.has('fail') ? counts : null;
}

let cleaning = false;
// down 也需要 compose 插值变量，否则会因缺少必填变量而清理失败。
function cleanup(env: Record<string, string>): void {
  if (cleaning) return;
  cleaning = true;
  try {
    compose(['down', '-v', '--remove-orphans', '--timeout', '5'], { env, timeout: 60_000 });
    console.info(`已清理随机项目 ${project}`);
  } finally { cleaning = false; }
}

// 信号兜底使用独立占位值，保证仍能移除本次项目。
const fallbackEnv = {
  SVADMIN_STORAGE_DB_PASSWORD: dbPassword,
  SVADMIN_AUTH_DB_PASSWORD: authDbPassword,
  SVADMIN_STORAGE_ACCEPTANCE_DB_PASSWORD: acceptanceDbPassword,
  SVADMIN_STORAGE_JWT_SECRET: jwtSecret,
  SVADMIN_STORAGE_ANON_KEY: 'placeholder',
  SVADMIN_STORAGE_SERVICE_KEY: 'placeholder',
};

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    try { cleanup(fallbackEnv); } catch { console.error(`清理失败：${project}`); }
    process.exit(signal === 'SIGINT' ? 130 : 143);
  });
}

let status = 1;
let stage = 'browser-deps';
// 清理需要的插值变量必须在 try 之外可见，保证异常路径也能 down -v。
let stackEnv: Record<string, string> = fallbackEnv;
try {
  buildBrowserPrerequisites();
  stage = 'runner';
  console.info(`启动 Docker context ${dockerContext} 的 Storage 验收栈 ${project}`);
  const [anonKey, serviceKey] = await Promise.all([
    keyFor({ role: 'anon', iss: 'supabase' }),
    keyFor({ role: 'service_role', iss: 'supabase' }),
  ]);
  stackEnv = {
    SVADMIN_STORAGE_DB_PASSWORD: dbPassword,
    SVADMIN_AUTH_DB_PASSWORD: authDbPassword,
    SVADMIN_STORAGE_ACCEPTANCE_DB_PASSWORD: acceptanceDbPassword,
    SVADMIN_STORAGE_JWT_SECRET: jwtSecret,
    SVADMIN_STORAGE_ANON_KEY: anonKey,
    SVADMIN_STORAGE_SERVICE_KEY: serviceKey,
  };

  compose(['up', '-d', '--pull', 'never', '--wait', '--wait-timeout', '60', 'storage-db', 'auth-db'], { env: stackEnv });
  // 先跑镜像自带迁移：它负责创建 storage schema、角色与表权限。
  // 服务定义里已有 DATABASE_URL（含本次随机密码），不再重复用 -e 传一次。
  compose(['run', '--rm', '--no-deps', '-e', 'LOG_LEVEL=warn',
    'storage', 'node', 'dist/scripts/migrate-call.js'], { env: stackEnv, timeout: 180_000 });

  // 迁移只启用 RLS 而不建策略：这里以 postgres 角色（psql 连接身份）建立私有 bucket
  // 与仅所有者可写的对象策略，并用 service_role 保留迁移/桶管理所需的表权限。
  psql('storage-db', 'svadmin_storage', `CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid;
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'));
$$;
INSERT INTO storage.buckets (id, name, public) VALUES ('${bucket}', '${bucket}', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS svadmin_owner_all ON storage.objects;
CREATE POLICY svadmin_owner_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = '${bucket}' AND owner = auth.uid())
  WITH CHECK (bucket_id = '${bucket}' AND owner = auth.uid());
GRANT ALL ON storage.objects TO authenticated, anon, service_role;`, stackEnv);

  // PostgREST 使用独立验收 schema，避免污染 storage schema。
  // authenticator 是专用 NOINHERIT 登录角色；普通请求不使用 postgres/service_role。
  // RLS 只信任 GoTrue admin 写入的 app_metadata.tenant_id，不读取 user_metadata。
  psql('storage-db', 'svadmin_storage', `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'svadmin_acceptance_authenticator') THEN
    CREATE ROLE svadmin_acceptance_authenticator LOGIN NOINHERIT;
  END IF;
END
$$;
ALTER ROLE svadmin_acceptance_authenticator LOGIN NOINHERIT PASSWORD '${acceptanceDbPassword}';
GRANT anon, authenticated TO svadmin_acceptance_authenticator;
CREATE SCHEMA IF NOT EXISTS enterprise_acceptance;
GRANT USAGE ON SCHEMA enterprise_acceptance TO anon, authenticated;
CREATE TABLE IF NOT EXISTS enterprise_acceptance.tenant_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  title text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE enterprise_acceptance.tenant_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_records_app_metadata_isolation ON enterprise_acceptance.tenant_records;
CREATE POLICY tenant_records_app_metadata_isolation
  ON enterprise_acceptance.tenant_records
  FOR ALL
  TO authenticated
  USING (tenant_id = current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')
  WITH CHECK (tenant_id = current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id');
GRANT SELECT, INSERT, UPDATE, DELETE ON enterprise_acceptance.tenant_records TO authenticated;`, stackEnv);

  // 专属本地验收表：title + attachment JSON 引用 + 可信租户声明。
  // AutoForm 不提交 tenant_id；列 DEFAULT 从 JWT app_metadata 填充，RLS 再校验
  // 任何显式 tenant_id 必须与可信声明一致（DEFAULT+RLS 允许同租户显式值）。
  // 这不是生产业务模型。
  psql('storage-db', 'svadmin_storage', `CREATE TABLE IF NOT EXISTS enterprise_acceptance.browser_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id'),
  title text NOT NULL,
  attachment jsonb
);
ALTER TABLE enterprise_acceptance.browser_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS browser_records_app_metadata_isolation ON enterprise_acceptance.browser_records;
CREATE POLICY browser_records_app_metadata_isolation
  ON enterprise_acceptance.browser_records
  FOR ALL
  TO authenticated
  USING (tenant_id = current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')
  WITH CHECK (tenant_id = current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id');
GRANT SELECT, INSERT, UPDATE, DELETE ON enterprise_acceptance.browser_records TO authenticated;`, stackEnv);

  // 仅本地验收使用的 CHECK 约束：让真实用户 PATCH 触发 PostgreSQL 23514，
  // 证明 QuickEditDrawer 的失败与草稿保留不是 mock。sentinel 不进入旧场景数据。
  psql('storage-db', 'svadmin_storage', `ALTER TABLE enterprise_acceptance.browser_records
  DROP CONSTRAINT IF EXISTS browser_records_acceptance_title_check;
ALTER TABLE enterprise_acceptance.browser_records
  ADD CONSTRAINT browser_records_acceptance_title_check
  CHECK (title <> 'svadmin-acceptance-invalid-title-sentinel');`, stackEnv);

  // GoTrue 使用独立数据库与自己的迁移；这里只预建 schema 与 pgcrypto 扩展。
  psql('auth-db', 'svadmin_auth', `CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION postgres;
CREATE EXTENSION IF NOT EXISTS pgcrypto;`, stackEnv);

  compose(['up', '-d', '--pull', 'never', '--wait', '--wait-timeout', '90', 'storage'], { env: stackEnv });
  compose(['up', '-d', '--pull', 'never', '--wait', '--wait-timeout', '90', 'auth'], { env: stackEnv });
  compose(['up', '-d', '--pull', 'never', '--wait', '--wait-timeout', '90', 'postgrest'], { env: stackEnv });
  const storageAddress = compose(['port', 'storage', '5000'], { env: stackEnv });
  const authAddress = compose(['port', 'auth', '9999'], { env: stackEnv });
  const restAddress = compose(['port', 'postgrest', '3000'], { env: stackEnv });
  if (!/^127\.0\.0\.1:\d+$/.test(storageAddress)) throw new Error('期望 Storage 回环限定端口，实际不匹配。');
  if (!/^127\.0\.0\.1:\d+$/.test(authAddress)) throw new Error('期望 GoTrue 回环限定端口，实际不匹配。');
  if (!/^127\.0\.0\.1:\d+$/.test(restAddress)) throw new Error('期望 PostgREST 回环限定端口，实际不匹配。');
  const storageUrl = `http://${storageAddress}`;
  const authUrl = `http://${authAddress}`;
  const restUrl = `http://${restAddress}`;

  let storageHealthy = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${storageUrl}/status`, { signal: AbortSignal.timeout(2000), redirect: 'error' });
      await response.body?.cancel();
      if (response.ok) { storageHealthy = true; break; }
    } catch { /* 等待迁移与监听就绪。 */ }
    await Bun.sleep(500);
  }
  if (!storageHealthy) throw new Error('Storage /status 健康检查超时。');

  let authHealthy = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${authUrl}/health`, { signal: AbortSignal.timeout(2000), redirect: 'error' });
      await response.body?.cancel();
      if (response.ok) { authHealthy = true; break; }
    } catch { /* 等待 GoTrue 自己的数据库迁移完成。 */ }
    await Bun.sleep(500);
  }
  if (!authHealthy) throw new Error('GoTrue /health 健康检查超时。');

  let restHealthy = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${restUrl}/`, { signal: AbortSignal.timeout(2000), redirect: 'error' });
      await response.body?.cancel();
      if (response.ok) { restHealthy = true; break; }
    } catch { /* 等待 PostgREST 连接池就绪。 */ }
    await Bun.sleep(500);
  }
  if (!restHealthy) throw new Error('PostgREST 健康检查超时。');

  console.info('GoTrue + Storage + PostgREST 就绪；运行单一 storage-acceptance 测试');
  // 测试子进程不得拿到签名 secret 或数据库口令，即使调用者环境里已有同名变量。
  const blockedNames = new Set([
    'SVADMIN_STORAGE_JWT_SECRET', 'SVADMIN_AUTH_JWT_SECRET',
    'SVADMIN_STORAGE_DB_PASSWORD', 'SVADMIN_AUTH_DB_PASSWORD',
    'SVADMIN_STORAGE_ACCEPTANCE_DB_PASSWORD',
    'SVADMIN_STORAGE_USER_A_KEY', 'SVADMIN_STORAGE_USER_B_KEY',
  ]);
  const testEnv = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !blockedNames.has(name)),
  );
  const result = spawnSync(process.execPath, [
    `--tsconfig-override=${fixtureTsconfig}`,
    'test', 'scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts', '--timeout', '120000',
  ], {
    cwd: root,
    env: {
      ...testEnv,
      SVADMIN_STORAGE_URL: storageUrl,
      SVADMIN_STORAGE_AUTH_URL: authUrl,
      SVADMIN_STORAGE_REST_URL: restUrl,
      SVADMIN_STORAGE_ANON_KEY: anonKey,
      SVADMIN_STORAGE_SERVICE_KEY: serviceKey,
      SVADMIN_STORAGE_RUN_MARKER: marker,
    },
    encoding: 'utf8', timeout: 240_000, maxBuffer: 4 * 1024 * 1024,
  });

  // 不打印原始测试/服务日志：失败只固定报告阶段，成功只报告标记、退出码与计数。
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const counts = parseTestCounts(output);
  const countText = counts === null
    ? 'pass=? fail=? skip=? todo=?'
    : `pass=${counts.pass} fail=${counts.fail} skip=${counts.skip} todo=${counts.todo}`;
  if (result.error || result.status !== 0) {
    // 不打印原始测试日志：失败只报告固定阶段、退出码与汇总计数，避免 token/password 泄露。
    console.error(`Storage 验收失败：stage=test exit=${result.status ?? 'timeout/spawn'} ${countText}`);
    reportSafeTestFailures(output);
  } else if (!output.includes(marker)) {
    console.error(`Storage 验收失败：stage=marker exit=0 ${countText}（缺少完成标记）`);
  } else if (counts === null) {
    console.error(`Storage 验收失败：stage=counts exit=0 ${countText}（缺少可解析的测试计数）`);
  } else if (counts.pass !== expectedPass || counts.fail !== 0 || counts.skip !== 0 || counts.todo !== 0) {
    console.error(`Storage 验收失败：stage=counts exit=0 ${countText}（期望 pass=${expectedPass} fail=0 skip=0 todo=0）`);
    reportSafeTestFailures(output);
  } else {
    console.info(`Storage 验收通过：marker=${marker} exit=0 ${countText}`);
    status = 0;
  }
} catch (error) {
  // 固定阶段名 + 已脱敏的短消息，不回显服务日志。
  const message = (error instanceof Error ? error.message : 'unknown error')
    .replaceAll(dbPassword, '[redacted]')
    .replaceAll(authDbPassword, '[redacted]')
    .replaceAll(acceptanceDbPassword, '[redacted]')
    .replaceAll(jwtSecret, '[redacted]')
    .split('\n')
    .slice(0, 3)
    .join(' | ');
  console.error(`Storage 验收失败：stage=${stage} ${message}`);
} finally {
  try { cleanup(stackEnv); } catch { console.error(`清理失败：${project}`); status = 1; }
}
process.exitCode = status;
