# 本地 GoTrue + Storage 联合验收证据（2026-10-26）

- 契约：`docs/evaluations/enterprise-auth-storage-contract-20261026.md`
- 工作树：`enterprise-storage-acceptance`（隔离 worktree，基线 `72ce9847`）
- 编排：managed / medium；pi 唯一实施 writer，主线程独立审查
- 环境：显式 `docker --context orbstack`；缓存镜像
  `public.ecr.aws/supabase/storage-api:v1.80.0`、
  `public.ecr.aws/supabase/gotrue:v2.197.0`、`postgres:18`

## 运行方式

```bash
bun scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts
```

runner 只操作随机 Compose 项目 `svadmin-auth-storage-smoke-<uuid>`，Storage 与 GoTrue
都绑定随机回环端口，并分别校验端口输出形如 `127.0.0.1:<port>`。GoTrue 使用独立
PostgreSQL 数据库；Storage 与 GoTrue 共享进程内生成的临时 HS256 JWT secret。
runner 只签发 anon/service 基础键，普通用户 A/B 由测试通过真实 GoTrue 注册和登录取得。
测试子进程环境会显式剔除 JWT secret、数据库口令和旧用户键。

正常与失败路径都只对本次随机项目执行 `down -v`；清理失败即退出 1。runner 不打印
原始测试或服务日志，成功只输出完成标记、`exit=0` 与 pass/fail 计数；失败只报告固定
阶段与已脱敏短消息。

runner 不接受仅 `exit=0` + 完成标记：必须解析出显式计数，并且严格等于
`pass=8 fail=0 skip=0 todo=0`。缺少 pass/fail 计数、出现 skip/todo 或任何未知计数
都按失败处理。

## 实测结果

- 实施者本轮运行：2026-10-26，`enterprise-storage-acceptance` 隔离 worktree。
- 单一测试：`scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts`
- 最终随机项目：`svadmin-auth-storage-smoke-b95cb91a-972d-4f84-8edf-9ee35b39b3ce`
- 结果：`pass=8 fail=0 skip=0 todo=0`，runner 退出码 `0`
- 完成标记：`SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE`
- 主线程独立运行：**已完成**，独立项目和结果见下方主线程复核记录，不与实施者运行合并计数。

| 场景 | 断言要点 | 结果 |
| --- | --- | --- |
| 真实 GoTrue 身份驱动上传回调 | A/B 经真实 `register` / `login` 取得会话；上传回调每次从当前 Auth provider 重新验证身份并取得会话 token，不缓存登录时 token；成功返回非空 `uploadId`，失败即 throw；`UploadSession.signal` 接到 fetch 层；`uploadReferenceFor` 只保留 `uploadId`；A 读回相同字节 | pass |
| 预先中止 | 调用前已 abort 时，同一个 UploadHandler 拒绝，不调用 setUploadId、不产生对象、不发布成功引用；**不等同于在途取消** | pass |
| 真实身份的对象授权边界 | B 的 GoTrue 会话 / 匿名读取 A 对象返回 `404 / NoSuchKey`；B / 匿名 `upsert` 覆盖返回 `403 / AccessDenied`；B / 匿名删除返回空集；A 仍读回原始字节 | pass |
| 匿名写与签名 URL 边界 | anon 对 A 对象 `createSignedUrl` 拒绝；anon 新建对象返回 `403 / AccessDenied`；service_role 列举确认未落库 | pass |
| B 的签名 URL 边界 | B 对 A 对象 `createSignedUrl` 拒绝；B 对自己对象可签发（反向对照） | pass |
| 签名 URL 实际可读 | 用 guardFetch **不带 Authorization** 读取签名 URL，字节与 A 上传内容一致；布尔断言，不打印 URL；引用序列化后不含签名 URL 或 `token=` | pass |
| 清理与重试 | 取消回调先校验列出的当前对象 `id` 与 `uploadId` 匹配再删除；未知 `uploadId` 被拒且原对象可读；匹配时删除 1 条；重复清理返回真实 `[]` 空操作 | pass |
| 刷新与退出后的会话语义 | 真实 `refreshSession` 后仍是同一 user id，新 access token 与旧值不同；不手动替换测试内 token，同一个 UploadHandler 从 provider 取得新会话后上传新对象并读回，且仍能读取刷新前对象。`logout` 后同一回调拒绝上传、不设置 uploadId；service_role 列举与下载精确确认没有新对象落库。旧 refresh token 在独立客户端重放失败 | pass |

## 关键实现事实

- Storage 与 GoTrue 共享临时 HS256 secret；GoTrue 签发的 access token 直接作为
  Storage `Authorization: Bearer`，Storage 通过 `auth.uid()` 从 JWT `sub` 取得对象所有者。
  普通用户 UUID 由 GoTrue 注册生成，runner 不再使用固定用户 UUID。
- GoTrue 使用独立 `svadmin_auth` 数据库，只预建 `auth` schema 与 `pgcrypto`；其余
  GoTrue 表由镜像迁移负责。Storage 数据库仍由 storage-api 迁移创建 schema/角色/表，
  runner 以 `postgres` 角色建立私有 bucket 与 owner-only 对象策略。
- 因用户 UUID 由 GoTrue 动态生成，bucket 本身不再预设固定 owner；对象所有权限定由
  `storage.objects.owner = auth.uid()` 策略执行。
- 测试只接收 Storage/GoTrue 回环 URL、anon/service 基础键与运行标记；不接收 JWT
  签名 secret。测试内所有 Storage 请求只允许两个已校验回环 origin，强制固定 20s
  timeout 与 `redirect: 'error'`；GoTrue 客户端的 `/auth/v1` 前缀在 guard 内映射到根路径。
- 签名 URL 由 Storage 服务自身签发；测试进程只发起读取并核对布尔结果，不签发 URL，
  不把 URL 或令牌写入引用、日志或文件。
- 普通用户 A/B 的 Storage 访问不再使用登录时缓存的 token；每次操作先通过真实
  Auth provider 的 `getIdentity()` 重新验证当前身份并取得会话 token，身份或 token
  缺失立即拒绝。刷新后自动使用新会话；登出后上传回调不会退回旧 token。
- 本轮未修改上一轮证据文件；`docs/evidence/enterprise-storage-acceptance-20261026.md`
  仍只代表 runner 本地签发用户 JWT 的 Storage RLS 证据，不作为本轮联合证明。

## 清理与静态检查

- 本轮 runner 正常结束，并对随机项目执行 `down -v --remove-orphans` 后输出清理完成。
- runner 与 test 两个 TypeScript 文件定向 ESLint 退出码 0；定向严格 TypeScript 检查（`strict`、
  `exactOptionalPropertyTypes`、`noUncheckedIndexedAccess`、
  `noPropertyAccessFromIndexSignature`）退出码 0。
- 对改动文件执行 `git diff --no-index --check /dev/null <file>` 无空白错误输出。
  本轮未提交、未推送、未发布，也未修改原工作区。

## 主线程独立运行（待执行）

- 主线程需在独立 review 后自行运行同一 runner，并以其自身输出核验
  `pass=8 fail=0 skip=0 todo=0`、`exit=0` 与完成标记。
- 在完成该独立运行前，本文件不记录主线程通过结果，也不把实施者运行结果等同于
  主线程验收结果。

## 主线程复核记录

- 独立项目：`svadmin-auth-storage-smoke-9ec99c55-9ff0-40e5-a8a7-f550582b0693`。
- 审查后的最终 runner 独立执行：`exit=0 pass=8 fail=0 skip=0 todo=0`，
  `SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE` 已出现。
- 审查要求的两项修正均已落实：上传不缓存 token，登出后复用同一回调实例拒绝且
  service role 确认无对象；runner 要求完整通过数，拒绝缺失计数、skip/todo。
- 两个 TypeScript 文件定向 ESLint 和严格类型检查独立通过（exit 0）；类型选项包含
  `strict`、`exactOptionalPropertyTypes`、`noUncheckedIndexedAccess`、
  `noPropertyAccessFromIndexSignature`。
- 分别对 Storage/GoTrue 两个地址执行七类非法输入，共 14 例；另验证缺失/错误标记
  两例，均在入口拒绝。完全未配置环境时跳过，不作为真实服务通过。
- `down -v` 后按本次精确 Compose project label 查询 containers、networks、volumes，
  三项均为空；没有清理其他项目。
- 代码实施由 pi 完成；主线程审查、独立验证，并仅补写本节和契约状态。

## 限制

- 临时密钥通过进程环境传入 Compose 服务，不写仓库凭据文件；运行期间 Docker
  管理员仍可读取容器环境，不能将其描述为对本机管理员保密。

- **不宣称登出会使旧 access token 立即失效**。本轮只证明 refresh token 不能重放、
  本地会话清空、provider 报告未认证；旧 JWT 在过期前是否仍被 Storage 接受未作为通过
  条件，也未做否定断言。
- 预先中止只证明“请求前已 abort 不会创建对象”，**没有**证明传输途中的在途取消与
  部分写入回滚语义。
- 未做 cleanup 失败故障注入；兜底依赖本次项目 `down -v`。
- 未覆盖 MFA/OAuth、邮件投递、跨服务生产身份映射、生产 bucket/RLS 策略、真实租户/
  RBAC、跨浏览器、实机读屏、registry 发布、部署或在线验收。
- 本地 disposable OrbStack 通过不等于生产 GoTrue/Storage 配置或发布验收。
