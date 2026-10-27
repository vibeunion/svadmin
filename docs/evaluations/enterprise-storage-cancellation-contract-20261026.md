# 在途传输取消专项验收契约

- parent: `docs/evaluations/enterprise-auth-storage-contract-20261026.md`
- source: 用户要求续接 B2-08 文件上传原始取消要求，在真实 GoTrue + Storage 联合环境中补
  “网络传输已开始但尚未完整发送”时的取消证据，而不是重复覆盖请求前预先中止。
- reason: 现有 `pass=8` 证据只覆盖请求前已 abort 的边界；不能据此宣称在途传输取消、
  客户端拒绝、引用未发布与服务端最终对象回读均被验证。
- orchestration/risk: managed / medium；pi 为唯一代码 writer，主线程独立 review 与定向
  验证。无 coordination.json / agmesh CLI，以本契约记录范围、边界和执行状态。
- workspace: 当前隔离工作树 `enterprise-storage-acceptance`。原工作区
  `/Users/zhd/workspace/svadmin` 不读取、不修改。
- scope: 仅扩展当前 `scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts` 与
  同目录 runner 的必要计数/注释；沿用现有 `UploadHandler`、`UploadSession.signal`、
  真实 GoTrue provider 与真实 Storage API。为确定性建立实时取消屏障，允许在测试进程内
  创建仅绑定 `127.0.0.1` 随机端口、仅接受单一 POST 路径并固定转发到当前真实 Storage
  origin 的临时受控代理；代理不成为开放代理，不伪装真实 Storage 成功响应。
- barrier: 代理在收到客户端首个请求体数据块并将其写入真实 Storage 上游连接后放行屏障。
  屏障只证明“首段已转发、客户端请求体尚未结束”，不证明 Storage 已解析、提交或持久化
  该部分数据，也不依赖 `sleep` 或超大文件赌时序。
- cancellation: 屏障后由现有 `UploadSession.signal` 控制器取消；必须观察到客户端上传
  回调拒绝、`setUploadId` 未被调用、`uploadReferenceFor` 不产生引用。
- server-readback: 取消并关闭代理/上游连接后，用 service_role 独立查询已知精确 fixture
  路径。正常预期为无最终对象；若观察到服务端残留，必须如实报告并按该最小已知路径清理，
  不得伪称原子回滚或“所有失败均无残留”。
- security: 请求仍只允许当前真实 Storage/GoTrue 回环 origin，强制请求超时与
  `redirect: 'error'`；代理仅绑定回环随机端口、校验单一方法与路径。不得输出或落盘
  token、口令、签名 URL 或原始请求头。所有 stream/socket/server 在 `finally` 关闭，
  不遗留后台进程。
- environment: 本地 OrbStack disposable 栈；随机 Compose project、临时数据库与临时密钥。
  不修改生产策略、公共 API 或真实部署。不提交、不推送、不发布。
- regression: 保留既有 8 个场景与 runner 原始 guard 入口；新增 1 个在途取消场景后，
  runner 必须显式校验 `pass=9 fail=0 skip=0 todo=0`。
- non-goals: 不宣称 Storage 支持原子回滚或所有失败均无残留；不证明 Storage 在首段
  数据到达后已完成对象写入；不覆盖 MFA/OAuth、邮件投递、生产身份映射、生产 bucket/RLS、
  部署、发布或旧 JWT 立即失效。

## 验收场景

```gherkin
Scenario: 真实网络传输已开始但未完成时取消上传
  Given A 通过真实 GoTrue 登录并取得当前会话 token
  And 测试临时代理仅接受指向已知 fixture 对象路径的 POST，并转发到当前真实 Storage origin
  When 上传开始且代理已把首个请求体数据块转发到真实 Storage，但客户端请求体尚未结束
  Then 通过现有 UploadSession.signal 取消，客户端上传回调拒绝
  And setUploadId 未被调用，uploadReferenceFor 不发布成功引用
  When 代理与上游连接关闭后由 service_role 独立查询该精确 fixture 路径
  Then 不发布最终对象；若观察到残留则如实报告并按最小已知路径清理
  And 此证据不宣称原子回滚、所有失败均无残留或 Storage 已提交首段数据
```

## 验收状态

- 状态：专项测试、同一单文件 runner 计数与证据文档已实施；pi 已在隔离 worktree 连续
  运行同一 runner 三次，均为 `pass=9 fail=0 skip=0 todo=0`、`exit=0` 且完成标记出现。
  本轮进一步加入严格短于 20s 传输超时的 5s 有界取消完成期限，并用同一真实 runner 做了
  “临时移除 `guardFetch` 信号中的 `scopeSignal` → `pass=8 fail=1` → 恢复 → `pass=9`”
  的取消因果 mutation 验证。主线程独立 review 与定向复跑已完成，最终同为
  `pass=9 fail=0 skip=0 todo=0`、`exit=0`，独立项目清理回读为空。总体企业级目标仍为
  PARTIAL，不代表合并、发布或生产验收。
- 既有联合验收证据保持原样：`docs/evidence/enterprise-auth-storage-acceptance-20261026.md`。
- 本轮只运行单一 `scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts` 及其
  runner，并执行窄 lint/typecheck/diff 检查；不做全仓排查或全量验证。
