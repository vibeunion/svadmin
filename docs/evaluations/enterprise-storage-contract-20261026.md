# 本地 Storage 验收续接契约

- parent: `enterprise-ui-unblock-contract-20261024.md`
- source: 用户授权 OrbStack 测试环境，持续目标要求 pi 执行、主线程审查。
- reason: Auth 基础生命周期已取得真实服务证据，续接原文件上传的对象存储验收缺口。
- orchestration/risk: managed / medium；pi 唯一实施 writer，主线程独立审查与定向验证。
  无 coordination.json / agmesh CLI；以本契约记录范围和执行状态。
- workspace: 隔离工作树 `enterprise-storage-acceptance`，基线 `72ce9847`。
  原工作区 dirty 和未跟踪版本服务、Storage 实验均保持原状，不复制为已验收实现。
- scope: 独立本地 Storage compose、初始化 SQL、单一测试与 runner；测试专用上传回调
  使用现有 UploadHandler/UploadCancelHandler 与 JSON 引用契约，不新增公共适配器。
- environment: 显式本机 orbstack；现有缓存 Storage API v1.80.0、PostgreSQL 18；
  随机 Compose project、loopback 端口、临时密钥、临时数据；不可触碰已有数据库/容器。
- security: bucket 预检与收尾清理使用 service role；私有 bucket 与 owner-only 策略由
  runner 以 `postgres` 角色（psql）创建。普通身份仅操作自有私有对象，其他身份和匿名
  读取/写入/删除拒绝。访问令牌/签名 URL 不进入持久化表单引用或运行日志。
- lifecycle: 正常和失败路径都执行本次 project 的 down -v；清理失败必须非零退出。
- non-goals: 无版本服务、MFA/OAuth、跨服务生产身份映射、生产 bucket/RLS 策略、生产
  发布/部署、实机读屏；不将 fixture 的令牌签发解释为真实 GoTrue/Storage 联合验收。
- execution: 本契约的本地 Storage 范围已实施并经主线程独立验证；总体企业级目标仍为
  PARTIAL，不代表合并、发布或生产验收。结果见
  `docs/evidence/enterprise-storage-acceptance-20261026.md`。

## 验收场景

```gherkin
Scenario: 文件上传回调返回可持久化引用
  Given 测试用户及只允许所有者访问的私有 bucket
  When 使用现有 UploadHandler 上传 File，并把会话 signal 接到 fetch 层
  Then 上传成功必须返回非空 uploadId，失败即 throw
  And 得到 uploadId JSON 引用而不保存 File 或签名凭据
  And 所有者可以读取相同字节

Scenario: 预先中止
  Given 一个在调用前就已 abort 的会话
  When 发起上传
  Then 不产生对象且不发布成功引用
  And 这不表示传输途中的在途取消已被验证

Scenario: 对象授权边界
  Given 用户 A 已上传的私有对象
  When 用户 B 或匿名身份读取、覆盖（upsert）、删除该对象，或用 Storage 自带
       createSignedUrl 为该对象申请读取 URL
  Then 对象不被披露或修改
  And 用户 A 仍可读回原始内容

Scenario: 清理与重试
  Given 已上传对象以及相应 uploadId
  When 调用测试专用取消回调（先校验 uploadId 与当前对象匹配再删除）并重复清理
  Then 所有者无法再读取对象
  And 未知 uploadId 不会删除原对象
  And 重复清理按真实 Storage API 结果记录，不伪称 exactly-once

Scenario: 验收入口不能访问远程环境
  Given 测试入口收到非严格 loopback URL（localhost/路径/userinfo/query/fragment）或缺少运行标记
  Then 不发出外部请求且不能被 runner 计为通过
```
