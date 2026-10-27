# 本地 GoTrue 会话 → PostgREST → PostgreSQL 租户 CRUD 验收契约

- parent: `docs/evaluations/enterprise-auth-storage-contract-20261026.md`
- source: 用户要求继续企业级既有真实服务验收；原 12 项中的第 11 项是
  AutoForm/FileUploadField 浏览器场景，手签用户 JWT 驱动 PostgREST 的独立证据来自
  单独的 `scripts/fixtures/enterprise-runtime/supabase-rbac.test.ts`，不属于原 11 项。
  本轮补齐真实 GoTrue 会话与 `createSupabaseDataProvider` 驱动的 PostgreSQL 租户 CRUD。
- reason: 独立 rbac fixture 的手签用户 JWT 只能证明 RLS 表达式，不证明真实 GoTrue
  注册/登录会话、可信 `app_metadata` 租户声明、Node 侧 data provider 与
  PostgREST/PostgreSQL 的完整链路。
- orchestration/risk: managed / medium；pi 为唯一实施 writer，主线程独立审查与最终
  台账。无 `coordination.json` / agmesh CLI；以本契约记录范围与执行状态。
- workspace: 隔离工作树 `enterprise-storage-acceptance`，保留全部既有改动。共享
  `node_modules` 是原工作区目录的链接，依赖安装仍可能读取原工作区；本轮不修改原
  工作区 `/Users/zhd/workspace/svadmin`，也不改共享 `node_modules`。测试源通过仅本
  fixture 使用的 `scripts/fixtures/enterprise-runtime/tsconfig.json` paths 显式指向
  当前工作树，并在测试内用 `import.meta.resolve` 断言关键直接/传递依赖未回原工作区；
  runner 仅以 `--tsconfig-override` 将该文件用于本 fixture 的 `bun test`。
- profile: 本机未找到 profile selector skills；明确沿用仓库已有
  PostgreSQL 18 / PostgREST v12.2.12 / Supabase GoTrue v2.197.0 profile，不迁移技术栈。
- scope: 在现有临时 Storage 栈内增加一个 PostgREST 服务；新增独立
  `enterprise_acceptance` schema 与表，避免污染 Storage 的 `storage` schema。runner
  在注册测试前完成 schema/table/role/bootstrap，测试只接收回环 URL、基础键与标记。
- identity: 普通用户必须经真实 GoTrue 注册登录；runner 不手签用户 token。可信租户由
  Node 侧 service-role `GoTrue admin.updateUserById` 写入 `app_metadata.tenant_id`，再
  登录/刷新取得真实 token。RLS 只读取 `app_metadata.tenant_id`，不信任用户可编辑的
  `user_metadata`。这是本地测试租户契约，不是生产 RBAC。
- transport: 仅允许精确 `http://127.0.0.1:<port>` origin；固定 `/rest/v1` 前缀映射到
  同一 origin 根路径，强制固定 timeout 与 `redirect: 'error'`，不把请求 suffix 拼到
  任意源。service-role 只用于可信种子与独立验证，永不进入浏览器。
- secrets: JWT secret、数据库口令、service-role key、用户 token/password 只存在于
  进程内存；不写文件、不打印原文，保存/断言失败也不回显 token/password，异常消息
  先脱敏。
- preserve: 保留现有 11 项全部断言；只在单一
  `scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts` 新增 1 项，runner
  期望 `pass=12 fail=0 skip=0 todo=0`。旧证据文件不改写。
- non-goals: 不实现生产版本服务、MFA/OAuth、业务审批、生产 RBAC、公共 API 扩张、
  部署或发布；不以 supabase-js 裸查询代替 `createSupabaseDataProvider` CRUD。
- lifecycle: 正常/失败路径只清理本次随机 Compose project；结束前按精确 project
  label 确认 containers/networks/volumes 均无残留。若发现真实代码缺陷，先报告而不
  在验收中掩盖。

## 验收场景

```gherkin
Scenario: 匿名身份不能读取租户表
  Given PostgREST 只暴露 enterprise_acceptance schema
  When 匿名 data provider 请求 tenant_records
  Then 请求被 PostgreSQL 权限/RLS 拒绝

Scenario: 真实 GoTrue 会话驱动租户 CRUD 与隔离
  Given A/B 通过真实 GoTrue 注册登录
  And Node 侧 service role 将 A/B 的 app_metadata.tenant_id 分别设为 tenant-a/tenant-b
  When A 经 createSupabaseDataProvider 在 PostgREST 创建 tenant-a 记录
  Then A 的同租户独立 GoTrue 会话可读回真实持久化值
  And A 更新后独立会话读回更新值
  When B 对 A 的记录执行 get/insert/update/delete
  Then 全部被拒绝且 A 的记录保持不变
  And B 自己的 tenant-b 记录不被 A 读取

Scenario: 用户伪造 user_metadata.tenant_id 不能提权
  Given B 已通过可信 admin 设置为 tenant-b
  When B 调用 GoTrue updateUser 写入 user_metadata.tenant_id = tenant-a 并刷新会话
  Then B 仍不能读取或写入 tenant-a 记录

Scenario: 本人删除后独立会话读不到
  Given A 已创建并更新 tenant-a 记录
  When A 经 data provider 删除该记录
  Then A 的独立会话读取该记录失败
```

## 执行状态

- 状态：pi 实施与审查修正已完成；主线程恢复本机环境后独立复跑最终实现
  **12/12，exit 0，零 skip/todo**，精确项目资源清理为空。运行时子项已验证，
  原定向类型检查的 `data-provider.ts:64` TS2345 已由后续窄修复消除并独立复验，
  整体企业级目标保持 PARTIAL。pi 与主线程结果在证据中分别记录。
- 证据：`docs/evidence/enterprise-postgrest-tenant-acceptance-20261026.md`（新增）；
  旧 Storage / GoTrue+Storage 证据保持原样。
- Follow-up 类型边界：上述 `data-provider.ts:64` TS2345 保留为修复前历史。后续
  窄修复契约见 `docs/evaluations/enterprise-supabase-refine-type-boundary-contract-20261026.md`；
  pi 已将 Refine 工厂调用改为既有 `Reflect.apply` 动态边界，公开 `client: unknown`
  不收窄。pi 与主线程定向 `tsc` 均 exit 0；主线程最终 runtime 12/12、直接单测
  12/12、严格测试编译与目标 ESLint/diff 全部通过，精确项目资源清理为空。
  只关闭所列本地门禁，不外推生产权限、完整业务浏览器闭环、读屏或发布。
