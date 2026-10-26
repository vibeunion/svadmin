# OrbStack 本地真实 Provider/RLS 验收（2026-10-25）

## 范围

本次建立独立的 `PostgreSQL 18 + PostgREST 12` 本地测试栈，不复用
`fa-pg18-rpc`，不连接远端 Supabase、测试项目或生产环境。PostgREST 使用
JWT `tenant_id` claim，数据库使用 RLS 做租户隔离；SVAdmin 通过真实
`@svadmin/supabase` DataProvider 发起 HTTP 请求。

## 启动

```bash
export SVADMIN_TEST_DB_PASSWORD='由当前 shell 临时提供'
export SVADMIN_TEST_JWT_SECRET='当前 shell 临时提供且至少 32 个字符'
docker compose -f docker/enterprise-test/compose.yml up -d db
until pg_isready -h 127.0.0.1 -p 15432 -U postgres -d svadmin_test; do sleep 1; done
bash scripts/fixtures/enterprise-runtime/bootstrap.sh
docker compose -f docker/enterprise-test/compose.yml up -d postgrest
SVADMIN_TEST_JWT_SECRET="$SVADMIN_TEST_JWT_SECRET" \
  bun test scripts/fixtures/enterprise-runtime/supabase-rbac.test.ts
docker compose -f docker/enterprise-test/compose.yml down -v
```

测试凭据只存在于当前 shell，不写入仓库或证据文件。

## 验收判据

- tenant-a 与 tenant-b 只能读到各自记录；
- tenant-a 可创建、更新并独立回读自己的记录；
- tenant-b 查询 tenant-a 新建记录返回空集；
- 所有请求经过真实 PostgREST HTTP 和 PostgreSQL RLS，不使用内存 Provider。

## 实际结果（2026-10-26）

- OrbStack Docker Engine：本机 `orbstack` context，PostgreSQL **18.6**，PostgREST
  **12.2.12**。
- 主线程独立运行：
  `SVADMIN_TEST_JWT_SECRET=... bun test scripts/fixtures/enterprise-runtime/supabase-rbac.test.ts`
  结果 **1 pass / 0 fail，14 assertions，exit 0**。
- 测试覆盖匿名拒绝、tenant-a/tenant-b 独立读取、正常创建/更新/删除、跨租户
  insert/update/delete 拒绝，以及独立 provider 回读确认越权写入没有发生。
- 验收中发现并修复 `@svadmin/supabase` 的 DELETE 适配缺口：PostgREST 默认不返回
  删除记录，适配器现显式链式 `select` 获取 representation，再进入严格响应校验。
- 测试结束后已执行 `docker compose -f docker/enterprise-test/compose.yml down -v`，
  不保留本地测试数据。

补充：PostgREST 12 的 HS256 secret 需要至少 32 个字符；fixture 现在会提前校验该
约束，避免把短测试值误报为业务签名或权限问题。

## 边界

本地栈可以关闭 Provider、租户 RLS 和真实 HTTP 数据读写的本地阻塞，但不等同
于 Supabase Auth/真实 RBAC 服务、文件对象存储、业务版本冲突 API、生产部署或
读屏实机验收。上传、任务取消/幂等、B3-05 版本历史仍需各自服务契约。
