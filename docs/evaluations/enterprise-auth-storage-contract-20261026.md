# 本地 GoTrue + Storage 联合验收契约

- parent: `docs/evaluations/enterprise-storage-contract-20261026.md`
- source: 用户要求继续企业级验收，并在当前隔离 worktree 以真实 GoTrue + Storage 联合验证原 Storage 对象边界。
- reason: 上一轮 Storage 证据由 runner 本地签发普通用户 JWT，只覆盖 Storage RLS，不构成真实
  GoTrue 会话驱动的联合证明；本轮补齐该缺口。
- orchestration/risk: managed / medium；pi 唯一实施 writer，主线程独立审查与定向验证。
  无 coordination.json / agmesh CLI；以本契约记录范围和执行状态。
- workspace: 隔离工作树 `enterprise-storage-acceptance`，基线 `72ce9847`。原工作区
  `/Users/zhd/workspace/svadmin` 不读取、不修改。
- scope: 最小扩展现有本地 Storage compose、runner 与单一测试文件，加入真实 GoTrue；
  复用 `createSupabaseAuthProvider`、`UploadHandler`、`StorageClient` 与 JSON 引用契约。
  保留既有 7 个 Storage 场景，新增联合会话场景。
- environment: 显式本机 OrbStack；现有缓存 Storage API v1.80.0、GoTrue v2.197.0、
  PostgreSQL 18；随机 Compose project、loopback 随机端口、临时数据库、临时密钥。
  仅本地 disposable 资源，无生产修改、提交、推送或发布。
- identity: 普通用户 A/B 必须由真实 GoTrue `register` / `login` 取得会话；runner 只签发
  anon/service 基础键，测试子进程不接收 JWT 签名 secret。Storage 与 GoTrue 共享临时
  JWT secret（HS256），GoTrue 使用独立数据库。
- security: 严格回环地址校验 Storage 与 GoTrue 两个 URL；请求强制固定 timeout、
  `redirect: 'error'`，只允许访问这两个回环 origin；拒绝外部网络。凭据、令牌、签名 URL
  不打印、不写文件，持久化 JSON 引用不得包含令牌或签名 URL。
- session: 上传回调不缓存登录时的 access token；每次调用都从当前真实 Auth provider
  重新验证身份并取得会话 token，身份或 token 缺失立即拒绝。刷新后自动使用新会话；
  登出后同一回调不得回退到旧 token 上传。
- lifecycle: 正常和失败路径都只对本次随机 project 执行 `down -v`；清理失败必须非零退出。
  失败退出非零；完成 marker 必须出现，并且 runner 必须解析出显式
  `pass=8 fail=0 skip=0 todo=0`。单用例 skip/todo、缺少计数或任何未知计数均不得通过。
- non-goals: 不证明登出后旧 JWT 立即失效（GoTrue/Storage 均按 JWT 过期语义）；不覆盖
  在途取消回滚、MFA/OAuth、邮件投递、生产身份映射、生产 bucket/RLS、部署或发布。

## 验收场景

```gherkin
Scenario: 真实 GoTrue 身份驱动上传回调
  Given A/B 通过真实 GoTrue 注册并登录，Storage 与 GoTrue 共享临时 JWT secret
  When A 通过现有 UploadHandler 上传私有对象，回调每次从 Auth provider 取得当前已验证会话 token
  Then 上传成功返回非空 uploadId，且持久化引用只保留 uploadId
  And A 可以用同一 GoTrue 会话读回相同字节

Scenario: 预先中止
  Given 一个在调用前就已 abort 的会话
  When 发起上传
  Then 不产生对象且不发布成功引用
  And 这不表示传输途中的在途取消已被验证

Scenario: 真实身份的对象授权边界
  Given A 已上传的私有对象
  When B 的 GoTrue 会话或匿名身份读取、覆盖、删除该对象，或为它申请签名读取 URL
  Then 对象不被披露或修改
  And A 仍可读回原始内容

Scenario: 匿名写与签名 URL 边界
  Given 仅所有者可访问的私有 bucket
  When 匿名身份新建对象或为 A 的对象签发 URL
  Then 两者都被拒绝
  And service_role 可确认没有对象落库

Scenario: B 的签名 URL 边界与签名读取
  Given B 拥有自己的对象
  When B 为 A 的对象签发 URL，或 A 为自己对象签发 URL 并匿名读取
  Then 跨身份签发被拒绝，所有者签名 URL 可读回原始字节
  And 引用序列化不包含签名 URL 或 token

Scenario: 清理与重试
  Given 已上传对象及对应 uploadId
  When 调用测试专用取消回调并重复清理
  Then 未知 uploadId 不删除原对象，匹配时真实删除，重复清理返回真实空结果

Scenario: 刷新与退出后的会话语义
  Given A 已登录并上传对象
  When 使用真实 refresh token 刷新会话
  Then 刷新后仍是同一 user id，且不需要手动替换测试缓存 token
  When 用同一个 UploadHandler 上传新对象
  Then 回调取得新会话 token 并上传成功，且新对象与刷新前对象都可读回
  When 用户登出
  Then 本地会话为空、provider 报告未认证、旧 refresh token 不能被重放
  And 同一 UploadHandler 拒绝上传、不设置 uploadId，service_role 精确确认没有新对象落库
  And 不宣称旧 access token 在过期前立即失效
```

## 执行状态

- 状态：本契约的本地 GoTrue + Storage 联合范围已按 review 缺口修正并实施；实施者已在
  隔离 worktree 运行同一 runner 通过（`pass=8 fail=0 skip=0 todo=0`、`exit=0`、完成标记
  出现）。主线程已独立审查并复跑同一 runner，结果同为
  `pass=8 fail=0 skip=0 todo=0`、`exit=0`；本轮随机项目资源清理已独立回读确认。
  总体企业级目标仍为 PARTIAL，不代表合并、发布或生产验收。
- 证据：`docs/evidence/enterprise-auth-storage-acceptance-20261026.md`；
  上一轮 `docs/evidence/enterprise-storage-acceptance-20261026.md` 保持原样，不作为联合证明。
- 本轮只运行单一 `scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts` 及其
  runner，未做全仓排查或全量验证。
