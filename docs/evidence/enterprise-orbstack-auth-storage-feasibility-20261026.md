# OrbStack Auth / 对象存储可行性验收（2026-10-26）

## 结论

当前仓库可以在本机 OrbStack 中继续验收 PostgreSQL、PostgREST、JWT claim
和 RLS；**不能在不猜测生产协议的前提下，直接验收 Supabase Auth 或对象存储**。

本次没有新增服务架构、没有启动 GoTrue/Storage API、没有发送真实 HTTP smoke，
也没有读取远端或仓库外秘密。原因是现有测试栈没有把 Auth/Storage 服务和明确的
schema、凭据、路由及权限契约接起来。按本任务边界，检查到此停止扩展。

## 检查边界

- Docker context 为本机 `orbstack`，Docker Engine 为本机 ARM64 引擎。
- 只检查仓库内 `docker/enterprise-test`、
  `scripts/fixtures/enterprise-runtime`、`packages/supabase` 和已有证据。
- compose 解析使用命令行内联的临时字符串：
  `local-temporary-db-password`、`local-temporary-jwt-secret-32-characters-minimum`；没有写入文件、
  shell 配置或仓库。
- 没有连接远端 Supabase、测试项目、生产环境或读取仓库外凭据。

## 实际检查命令与结果

### 1. OrbStack 可用性

命令：

```bash
docker context show
docker version
```

结果：

- `docker context show`：`orbstack`
- Docker Client/Server：`29.8.2`
- Server 平台：`linux/arm64`

退出码：`0`。

### 2. 现有 compose 能力

命令：

```bash
SVADMIN_TEST_DB_PASSWORD='local-temporary-db-password' \
SVADMIN_TEST_JWT_SECRET='local-temporary-jwt-secret-32-characters-minimum' \
docker compose -f docker/enterprise-test/compose.yml config --services

SVADMIN_TEST_DB_PASSWORD='local-temporary-db-password' \
SVADMIN_TEST_JWT_SECRET='local-temporary-jwt-secret-32-characters-minimum' \
docker compose -f docker/enterprise-test/compose.yml config
```

结果：

- 服务只有 `db` 和 `postgrest`。
- `db` 使用 `postgres:18`，绑定 `127.0.0.1:15432:5432`。
- `postgrest` 使用 `postgrest/postgrest:v12.2.12`，绑定
  `127.0.0.1:15433:3000`，只配置 `PGRST_DB_URI`、`PGRST_DB_SCHEMA`、匿名角色、
  JWT secret 和 audience。
- 没有 `auth`/GoTrue 服务、`storage` 服务、Storage API 路由、服务发现或
  对象存储卷。

退出码：两个命令均为 `0`。未提供环境变量时，原始 compose 校验命令会在
  `SVADMIN_TEST_DB_PASSWORD` 和 `SVADMIN_TEST_JWT_SECRET` 缺失处失败；本次只用
  上述命令行临时值重新解析，没有把值写入 `.env`。

### 3. fixture 与数据库契约

检查命令：

```bash
rg --files docker/enterprise-test scripts/fixtures/enterprise-runtime
sed -n '1,220p' scripts/fixtures/enterprise-runtime/bootstrap.sh
sed -n '1,220p' scripts/fixtures/enterprise-runtime/supabase-rbac.test.ts
```

结果：

- fixture 只有 `bootstrap.sh` 和 `supabase-rbac.test.ts`。
- bootstrap 只创建 `anon`、`authenticated`、`authenticator` 角色，以及
  `public.enterprise_records`、`tenant_id` RLS policy 和测试记录。
- 测试通过 PostgREST HTTP 验证租户读写边界；它签发的是测试进程内的 HS256 JWT，
  不是 GoTrue 签发的注册、登录、刷新或用户会话。
- 未发现 `auth.users`、GoTrue 配置、JWKS/issuer、密码策略、刷新 token 生命周期、
  Storage schema、bucket/object policy、签名 URL 或对象清理契约。

已有证据 `docs/evidence/enterprise-orbstack-rbac-20261025.md` 证明的是
PostgreSQL/PostgREST/RLS 数据路径，不把结果扩展为 Auth 或文件存储验收。

### 4. 本机镜像与运行容器

命令：

```bash
docker ps -a --format '{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}'
docker image inspect public.ecr.aws/supabase/gotrue:v2.197.0 \
  --format 'image={{.RepoTags}} entrypoint={{json .Config.Entrypoint}} cmd={{json .Config.Cmd}} exposed={{json .Config.ExposedPorts}}'
docker image inspect public.ecr.aws/supabase/storage-api:v1.80.0 \
  --format 'image={{.RepoTags}} entrypoint={{json .Config.Entrypoint}} cmd={{json .Config.Cmd}} exposed={{json .Config.ExposedPorts}}'
```

结果：

- 本机缓存了 `public.ecr.aws/supabase/gotrue:v2.197.0` 和
  `public.ecr.aws/supabase/storage-api:v1.80.0` 镜像。
- GoTrue 镜像元数据为 `cmd=["auth"]`，没有由本仓库提供的运行配置、数据库迁移、
  issuer/JWT 设置或健康检查契约。
- Storage API 镜像元数据暴露 `5000/tcp`，但本仓库没有对应 compose service、
  S3/filesystem backend、Storage schema 初始化或 bucket policy。
- `docker ps -a` 中没有正在运行的 GoTrue 或 Storage API 容器；发现的已退出容器
  属于其他历史测试栈，不能作为当前仓库的可验收服务。

因此，“本机有镜像”不等于“当前仓库已经具备可安全验收的 Auth/Storage 栈”。

### 5. `packages/supabase` API 边界

检查命令：

```bash
rg -n -i 'gotrue|auth/v1|storage-api|storage/v1|bucket|object' \
  docker scripts/fixtures/enterprise-runtime packages/supabase
sed -n '1,120p' packages/supabase/src/index.ts
sed -n '1,180p' packages/supabase/src/auth-contract.ts
```

结果：

- `packages/supabase` 导出 `createSupabaseAuthProvider`，并定义了对
  `signInWithPassword`、`signUp`、`getSession`、`getUser`、`signOut` 等 SDK 方法的
  输入/响应校验。
- 这些是客户端适配器和 mock/SDK 边界契约，不是可启动的 GoTrue 服务协议；仓库内
  没有把它们映射到本地 Auth URL、数据库迁移、issuer、邮件/密码策略或 JWT/JWKS
  验收配置。
- 在该目标范围内未发现 `storage.from(...)`、Storage API adapter、bucket/object
  schema 或对象权限契约。

## 为什么没有 HTTP smoke

最小 Auth smoke 至少需要明确的本地 GoTrue URL、issuer/JWT 签发方式、初始化用户
schema、匿名/publishable key、注册/登录/刷新/登出清理语义，以及测试用户清理方式。
最小 Storage smoke 至少需要明确的 Storage API URL、backend、`storage` schema、
bucket 初始化、对象读写/删除策略、签名 URL 语义和清理方式。

当前仓库没有提供这些契约。直接把缓存镜像拼接进现有 compose 会引入未经确认的
服务版本、环境变量、数据库迁移和权限模型，不能作为安全验收。因此本次不启动容器、
不猜测路由、不执行 Auth/Storage HTTP 请求。

## 精确缺口与下一步最小输入

要解除当前可行性阻塞，只需先提供一份**本地测试专用、非生产**的契约输入，不需要
修改生产协议：

1. 选择验收目标：上游兼容 GoTrue，或仓库已约定的 Auth 服务；明确镜像/tag、
   本地端口、issuer、JWT/JWKS 方式和数据库迁移入口。
2. 若验收对象存储，明确 Storage API 镜像/tag、backend（本地 filesystem 或
   临时 S3 兼容服务）、端口、bucket 初始化和对象权限/清理契约。
3. 提供可丢弃的临时数据库/服务密钥注入方式（仅当前 shell 或 CI secret），以及
   可重复的初始化与 teardown 命令；禁止把凭据写入仓库。
4. 明确 `packages/supabase` 需要验收的消费者路径：Auth provider 的哪些操作，
   或对象存储由哪个 adapter/调用方负责。当前代码没有 Storage adapter，不能从
   `createSupabaseAuthProvider` 推断 Storage 语义。

拿到以上最小输入后，下一轮才可在独立临时 project 名称下补充最小本地服务并运行
注册/登录/刷新/登出或对象上传/下载/删除/权限拒绝 smoke；在此之前不应宣称
Supabase Auth 或对象存储已完成企业级验收。

## 本次变更与清理

- 仅新增本证据文档。
- 未修改源码、compose、测试或其他文档。
- 未启动或创建临时容器，因此没有待清理的本次容器、卷或网络。
- 未提交、未推送、未部署。
