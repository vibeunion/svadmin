# 企业级本地收口有界审计（2026-10-27）

- parent：`docs/evaluations/enterprise-ui-closeout-20261024.md` 最近补记、
  `docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` B2-05。
- source：用户要求在既有 Surface/Toast 修复之后，只读审计 B2-05 异步
  Select/MultiSelect/AutoComplete 是否有“尚未闭环且不依赖外部输入”的明确原始要求，
  并校正真实服务验收口径。
- orchestration/risk：documentation-only / low；跳过 delegation gate，记录为
  pi writer、主线程 reviewer。未修改生产代码、测试、fixture、依赖或编排文件。
- scope：只读核对 B2-05 四条原始要求（搜索取消、分页、虚拟化、选中回显）、
  现有直接证据和剩余外部依赖；同时把 OrbStack **14/14** 已解除的真实服务范围写清。
- 非目标：不新增 API、不补测试、不重跑浏览器矩阵、不执行全量测试/构建、不提交、
  不推送、不部署，也不改动任何既有 dirty 工作区内容。

## 1. 判定结论

**B2-05 未发现“尚未闭环且不依赖外部输入”的明确原始要求，也未发现可确定复现的
生产 bug。** 四条原始要求在当前公开 API 与本地证据范围内均已有直接覆盖；剩余项
全部需要真实外部契约或授权，不能由本地代码继续补 case 关闭。

因此本轮不编辑生产代码，不新增测试，不重复既有浏览器矩阵。若主线程后续观察到
实际缺陷，复现入口应落在下列公开路径，而不是再从文档推断新 API：

- 搜索取消/超时：`packages/core/src/select-query.svelte.ts` 的
  `createSelectQuery().onSearchChange`、公开 `cancel()` 与 `requestTimeout`。
- 分页/虚拟化/回显：`packages/ui/src/components/ComboboxField.svelte` 与
  `packages/ui/src/components/AutoComplete.svelte` 的候选列表、`Load more`、
  `aria-activedescendant` 和已选摘要；单值入口为 `AutoComplete.svelte`。

## 2. B2-05 四条原始要求逐项核对

原始要求来自验收矩阵 B2-05：“搜索取消、分页、虚拟化、选中回显”。以下只判断
当前源码是否存在明确本地缺口，不把旧测试计数当作本轮复跑结果。

| 原始要求 | 当前源码对应 | 既有直接证据 | 本地判定 |
| --- | --- | --- | --- |
| 搜索取消 | `select-query.svelte.ts` 在派发前把 TanStack `signal` 转发给 Provider；搜索切换、卸载和显式 `cancel()` 走 `cancelOwnedRequests`；同类旧请求与超时使用同一 `AbortController`，公开 `SELECT_REQUEST_CANCELLED`/`SELECT_REQUEST_TIMEOUT` | `select-contract` 77/77、专属 Playwright 78/78 中“快速搜索旧请求不覆盖新结果且旧 signal 已 aborted”、超时后恢复 | 已闭环；不再重复同类用例 |
| 分页 | `ComboboxField.svelte` 以 `page` 递增、保留已加载候选并显示 `Load more`；`AutoComplete.svelte` 同样有 `hasMore`/`loadMore`；`createSelectQuery` 透传 `pagination` 与 `fetchSize` | Combobox 50/50 覆盖分页累积；Playwright 覆盖分页 1200 候选滚动选中；`total` 驱动 `hasMore` | 已闭环 |
| 虚拟化 | 两个组件在候选数达到 200 时启用固定行高窗口化，仅渲染可视区加缓冲；键盘 Home/End/Arrow 基于完整候选数组并同步滚动、维护 `aria-activedescendant` | Combobox 50/50 覆盖 1200 候选窗口化与跨窗口键盘；Playwright 用真实键盘复验 | 已闭环 |
| 选中回显 | 多选摘要与单值输入均独立于候选列表错误/搜索过滤；`defaultValueQuery` 通过 `getMany` 取得已选记录，外部清空与公开 `clear(null)` 同步回显 | Combobox 50/50 覆盖分页失败/重试期间摘要保持；AutoComplete 15/15 覆盖外部清空、clear、Escape 恢复、受控值重开改选；Playwright 覆盖 auth session reset 后标签/候选清空 | 已闭环 |

### 2.1 边界说明

- Provider 若不响应 `AbortSignal`，本地仍只靠 session/scope 隔离拒绝迟到结果；
  这属于真实 Provider 能力，不是当前前端可独立闭环的原始要求。
- 虚拟化只承诺 200 行阈值后的窗口化与现有键盘路径，不外推为任意规模性能保证，
  也不承诺屏幕阅读器对窗口化列表的实机朗读。
- AutoComplete 的最小公开范围是单值搜索/选择/回显；多选、自由文本提交和服务端
  建议排序未被原始要求明确列出，不据此扩成新 API。

## 3. 未闭环项与精确外部依赖

B2-05 的剩余项均需要外部输入，不能继续用本地 stub 或 DOM 断言关闭：

1. **真实查询 Provider/后端取消与超时能力**：需要 Provider 实际消费并传播
   `AbortSignal`，以及可观测的服务端取消/超时上限；本地只证明适配器透传与前端
   隔离。
2. **真实 RBAC/租户撤销**：需要真实授权服务和撤权时序；浏览器内的本地 auth
   session reset 不等于服务端 RBAC 或租户授权已完成。
3. **屏幕阅读器实机**：需要真实读屏对窗口化列表、已选摘要和 AutoComplete 的
   朗读证据；ARIA 属性与真实浏览器操作不等同读屏认证。
4. **发布包消费与部署**：需要 registry 发布、消费方安装和部署授权；本地
   `pack:check` 与 tarball 审计不替代发布验收。

这些依赖未取得前，B2-05 与整体企业级目标继续保持 **PARTIAL**；不得把本地
证据外推为生产 Provider、RBAC、读屏或发布完成。

## 4. OrbStack 14/14 已解除的真实服务范围

此前“全部真实服务未验收”的笼统口径已不准确。当前仓库在隔离 worktree 中用
OrbStack 拉起随机 Compose project（真实 PostgreSQL 18 + PostgREST + GoTrue +
Storage API），主线程已对稳定帧补充后的最终代码独立复验
**`pass=14 fail=0 skip=0 todo=0`、exit 0**，并复核精确 project label 的容器
（含已停止）、network、volume 均为空。证据见
`docs/evidence/enterprise-resource-workspace-service-20261026.md`。

已由该 **14/14** 解除的本地真实服务验收包括：

- **真实 GoTrue 身份与会话**：注册、登录、`refreshSession`、登出；上传/数据请求
  每次从当前 Auth provider 重新取得身份与 token，刷新后使用新会话。
- **真实 Storage 对象授权与生命周期**：A/B 所有者隔离、匿名与跨用户读取/覆盖/
  删除拒绝、签名 URL 边界、上传回调解引用、预先中止与在途取消、取消清理的
  `uploadId` 匹配校验、登出后拒绝上传且无对象落库。
- **真实 PostgREST/PostgreSQL 租户隔离与 CRUD**：真实 JWT 驱动 RLS，跨租户写入
  拒绝、独立回读、服务端错误码（含 CHECK `23514`）透传与失败后原行保留。
- **真实浏览器消费者流程**：`FileUpload`/`AutoForm` 上传与失败重试；
  `AutoForm` 经 data provider 持久化并由独立会话读回；`ResourceOperationsPage`/
  `AutoTable` 的真实搜索、第 2 页、详情、快速编辑拒绝保留草稿和修正保存。
- **该第 14 项的跨引擎路径**：同一条第 14 项内部依次运行 Chromium、Firefox、
  WebKit，缺少任一引擎即失败；3 个引擎仍计为 1 项测试。

同一批次另有独立证据 `docs/evidence/enterprise-auth-storage-acceptance-20261026.md`
记录 GoTrue + Storage 联合的 **8/8** 场景。8/8 与 14/14 是不同 runner 版本/范围，
分别记录，不合并计数。

## 5. 仍未被 14/14 解除的范围

14/14 只关闭上述**本地可丢弃服务契约**，以下仍保持未验收，且不得再用“已做真实
服务”笼统覆盖：

- 生产 RBAC、字段级权限、即时撤权；旧 access token 在过期前是否仍被 Storage
  接受未作为否定断言。
- 生产 bucket/RLS 策略、MFA/OAuth、邮件投递、跨服务事务、生产身份映射。
- 移动端视觉、真实读屏、跨源 CORS、大文件流式与生产网络条件。
- registry 发布、跨版本消费、部署与在线验收。
- B2-05 的真实 Provider 取消/超时能力与真实租户撤权时序（见第 3 节）。

因此整体状态仍为 **PARTIAL**，但表述必须区分：**本地真实 PostgreSQL/PostgREST/
GoTrue/Storage 流程已由 OrbStack 14/14 解除；生产 RBAC、发布、部署、读屏等外部
验收仍未解除。**

## 6. 本轮执行与保留

- 本轮只读取文档、源码和既有证据，未运行测试、浏览器矩阵、构建或全量套件。
- 未修改生产代码、测试、fixture、依赖或配置；仅新增本证据文件。
- 工作区全部既有 dirty 保留，未提交、未推送、未部署。
- 结论供主线程独立审查；若审查发现实际缺陷，按第 1 节公开复现入口另开有界修复，
  不在本轮直接改生产代码。
