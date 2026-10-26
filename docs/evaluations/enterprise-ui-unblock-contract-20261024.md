# 企业 UI 阻塞解除实施契约

> 当前结果：内部引用、显式 oneOf 和 example AutoForm 草稿接入已完成本地实施及
> 定向验证，见 [当前收口记录](enterprise-ui-closeout-20261024.md)。
> 下文阶段一的 oneOf/消费者“剩余项”仅是历史边界，已分别由
> `schema-oneof-contract-20261024.md` 与 `workspace-business-draft-contract-20261024.md`
> 续接完成。真实服务验收仍为 PARTIAL；远程引用禁止，不再等待重复批准。

- source: 用户对阻塞结论明确要求“解决阻塞”。
- parent: enterprise-ui-remaining-decisions-20261024.md
- reason: 采用此前已向用户展示的推荐默认值进入实施，不再重复索要同一批准模板。
- orchestration: managed；pi 单一代码 writer，主线程独立审查与定向验证。
- risk: medium；无内置远程 Schema 获取、无真实服务写入、无发布或部署。
- 本次只修改关联组件、适配器及直接测试；保留全部既有 dirty 改动。

## 阶段和边界

### 2026-10-26 本地 Auth 验收续接

- parent/source: 本契约及 `enterprise-orbstack-auth-storage-feasibility-20261026.md`；
  用户明确提供本机 OrbStack 并再次要求继续，作为恢复 PARTIAL 的授权记录。
- reason: 以可丢弃的上游兼容 GoTrue 测试环境验证现有 Auth provider，不将缺少
  本地服务配置继续视为必须由用户提供的生产决策。
- scope: 独立 Auth compose、单一集成测试、生命周期 runner 和证据文档。
  不更改生产 API、MFA/AAL、Storage、版本服务、TreeSelect 产品语义或 B4 选型。
- risk/orchestration: medium / managed；pi 单一代码 writer，主线程独立审查、
  执行和记录验证。当前无 coordination.json，agmesh 命令不可用，契约记录为准。
- environment: 本机 `orbstack`；独立随机 Compose project、临时 PostgreSQL、
  loopback 端口；凭据只保存在进程环境，不复用业务数据库或外部账户。
- acceptance: 真实 GoTrue 注册、登录、身份读取、刷新、登出及错误密码拒绝；
  登出后 refresh token 不可恢复会话；无论测试成功失败都清理本次项目和数据卷。
- non-goals: SMTP 投递、OAuth、MFA、生产 JWT/JWKS、真实业务 RBAC/租户、
  对象权限、实机读屏、registry 发布、部署及在线验收仍独立计证。
- execution: 本地 Auth smoke 已通过；本节仍不是生产服务或在线验收证明。结果见
  `../evidence/enterprise-orbstack-auth-smoke-20261026.md`。
- recovery: pi 初稿在主线程实际运行前后由主线程集成修正；一名只读审查者复核安全
  边界。最终定向测试为 `supabase-auth.test.ts`，不新增生产认证 API。

1. Schema 引用必须贯穿渲染、默认值和提交校验；第一阶段为根 `$defs`
   中的有界内部引用。远程/相对引用继续显式拒绝，绝不静默忽略断言。
   `oneOf` 与外部受控适配保持独立剩余项，不因内部引用实现而关闭整个 B2-11。
2. 草稿内容默认关闭，启用时必须提供用户/租户作用域、字段白名单与存储适配器。
   仅接受有界纯 JSON 数据，拒绝敏感字段白名单之外的数据和 File/Blob。
   64KiB 上限；失败向宿主返回原因；恢复只返回待确认草稿，不触发服务端写入。
3. B4 保持未选。真实服务/RBAC/读屏验收需要对应环境；本次授权不是生产部署授权。

## 验收场景

```gherkin
Scenario: 引用字段可实际填写与提交
  Given 根 definitions 定义了可复用的数字与嵌套对象
  When JsonSchemaForm 使用内部引用渲染并提交
  Then 字段类型、默认值与验证规则来自同一份展开后的 Schema

Scenario: 引用失败不降级
  Given 引用缺失、循环、超限或指向远程 URI
  When 表单准备配置
  Then 提交关闭且有稳定错误码和 JSON Pointer，不发起网络请求

Scenario: 草稿保存不越过宿主授权范围
  Given 宿主显式开启草稿并指定白名单与身份
  When 保存含白名单外字段或不可序列化值的输入
  Then 白名单外字段不进入存储，不合法或超限的候选明确失败

Scenario: 草稿隔离与恢复
  Given 已保存特定用户、租户、标签和路径的草稿
  When 相同作用域刷新后读取，或不同作用域尝试读取
  Then 相同作用域取得待确认草稿，不同作用域不能取得草稿，且均不写业务数据
```

## 结果记录

本文件是实施契约，不是通过证明。实际执行结果另列证据，
内部引用和宿主草稿能力均不能替代真实业务后端验收。

## 恢复执行与审查补充

- source: 用户“解决阻塞”，续接当前契约；产品默认值不再重复等待批准。
- orchestration: 延续 managed，pi 为草稿适配器及草稿浏览器夹具 writer，
  主线程审查和独立验证；主线程另承担 Schema 元数据兼容的窄范围修复，
  由一名只读 reviewer 审查。两者写入范围不重叠，不重复编辑同一文件。
  当前 checkout 没有 `.agents/state/coordination.json`，且未安装 `agmesh`；
  使用本文件记录执行边界，不虚构协调系统状态。
- 草稿校验须同时约束写入和恢复：深度 32、总节点 10,000，恢复时也检查
  原始草稿的 UTF-8 字节上限。白名单复制到适配器内部，禁止后续修改配置绕过验证。
- 未指定用户只保持旧视图快照兼容，不启用字段草稿。显式用户与匿名兼容作用域
  必须分离；启用草稿要求非空白 tenant/user，读取用户快照要求身份精确匹配。
- `markDraft(false)` 或显式 `capture({ draft: false })` 清除草稿内容，
  避免保存完成后再次恢复旧值；`draftData: undefined` 显式清除，
  省略 `draftData` 才沿用旧值。
- Schema 兼容性补充：保留既有 TypeBox Schema 元数据兼容，不执行 Symbol
  访问器，不放宽提交数据的纯 JSON 边界。
- 草稿消费者证据：在既有受控浏览器夹具的显式 `draftPayload` 模式中，
  覆盖字段输入、刷新、待确认恢复、丢弃及用户/租户隔离。该夹具不是
  example 的业务 AutoForm 或生产身份实现，不外推真实服务验收。

上述是当前实施和审查范围。`oneOf` 显式分支、消费者草稿恢复、真实服务/RBAC
仍需各自证据；远程引用明确禁止，不能将其重新列作本轮等待批准项。

## 阶段一结果（历史）

- 草稿适配器：主线程独立 **43/43**，受控消费者桌面三引擎 **18/18**。
- Schema：主线程递归 **22/22**，企业表单 **69/69**；独立 reviewer 指出的
  默认数组 Symbol 丢弃和未知非枚举元数据问题已修复并纳入回归。
- 目标 ESLint、diff 检查通过；证据分别在
  `../evidence/workspace-tabs-draft-payload-20261024.md` 和
  `../evidence/schema-form-b2-11-boundary-audit-20261023.md`。
- 当时阶段实现及定向验证完成，整体 PARTIAL。`oneOf` 和 example 业务草稿接入
  当时是本地剩余项，现已按顶部续接契约完成；真实服务仍需要明确测试环境、
  低权限测试身份/租户、服务契约和允许操作范围，不能用本地 fixture 替代。
- 未提交、推送、发布或部署，不将此前分发包证据用于这些新增源码。
