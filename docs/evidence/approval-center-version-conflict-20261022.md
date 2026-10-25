# 审批中心版本冲突保留意见与待办状态

## 续接约定

- parent: `approval-center-idempotent-retry-20261022.md`
- source: 用户要求继续实施 B3-07 审批中心，补充真实组件契约回归。
- reason: 既有冲突用例只断言冲突提示和记录仍为 pending，未验证用户已填写意见时对话框、草稿和单次提交边界。
- goal: 用真实 `ApprovalCenter` 组件契约锁定 `VERSION_CONFLICT` 后的失败行为，不误报成功。
- scope: `packages/ui/src/components/approval-center.test.svelte.ts`、本证据与 B3-07 矩阵。
- non-goals: 不修改生产组件，不修改 Provider 协议，不实现服务端冲突重放、真实 RBAC 或发布流程。
- risk/orchestration: medium / managed；pi 为唯一 writer，未提交、未推送、未部署。

## 验收场景

```gherkin
Given 当前审批记录版本为 2 且状态为 pending
When 用户填写意见 "Keep receipt" 并点击 Approve 后确认
Then 只调用一次 transition，且请求携带 expectedVersion 2、action approve 与原样意见
When Provider 返回 VERSION_CONFLICT 与已变更的当前记录
Then 对话框保持打开，意见 "Keep receipt" 原样保留
And 对话框内显示冲突提示
And 记录仍显示 pending，不出现 approved 成功关闭
And 操作入口恢复可用，用户可修改后重试
```

## 实施结果

新增真实组件契约用例
`keeps the dialog, comment and pending record while showing a version conflict`。
该用例在 **未修改生产代码** 的情况下直接通过，说明当前
`ApprovalCenter.svelte` 的冲突分支已满足上述行为：

- `transition` 仅调用一次；
- 冲突回执只设置 `conflict` 错误，不关闭对话框、不应用 `current` 记录；
- 已填写意见未被清空；
- 冲突提示保留在对话框内；
- 列表与详情仍显示原记录的 `pending` 状态。

由于没有红测，未对生产代码制造改动。

## 验证状态

在 `packages/ui` 执行：

```text
bunx vitest run src/components/approval-center.test.svelte.ts
```

- pi（本轮新增回归后）：**1 个测试文件通过，20/20 通过**，原始 exit code `0`，duration `8.35s`，时间 `20:18:49`。
- 主线程独立复核（最终同一命令）：**1 个测试文件通过，20/20 通过**，原始 exit code `0`，duration `6.89s`。

两次运行分开记录、不合并。此前记录的“主线程新增前 `19/19`、`13.64s` 基线”在本轮没有当前可验证的执行证据，已从本轮结果中移除；它不能作为主线程本轮结果，也不能与当前 `20/20` 合并。当前唯一已确认的主线程单测结果是 `20/20 passed`、原始 exit code `0`、`6.89s`。

本轮**未修改生产代码**。真实审批 Provider、真实 RBAC、服务端版本冲突/幂等、读屏及发布仍未验收。

`git diff --check`：通过（exit code `0`）。

## 真实浏览器冲突验证（本轮续接）

为把上述组件契约放到真实浏览器交互中验证，新增以下专用夹具与配置，不修改生产组件或 Provider 协议：

- `scripts/fixtures/enterprise-ui/ApprovalCenterFixture.svelte`：新增可选 `conflict-action` 模式。`transition` 返回
  `VERSION_CONFLICT` 与版本已变化的 `current`，随后 `list` 读取到该 `current`，用于验证刷新后的服务端状态；
  未启用该模式时保留原成功与 `fail-action` 行为。
- `scripts/fixtures/enterprise-ui/approval-center-conflict.spec.ts`
- `scripts/fixtures/enterprise-ui/playwright.approval-conflict.config.ts`

执行命令与原始结果：

```text
bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.approval-conflict.config.ts
```

- pi 执行：**6/6 passed**，原始 exit code `0`，duration `7.2s`。
- 主线程独立复核（最新同一配置）：**6/6 passed**，原始 exit code `0`，duration `6.2s`。
- 两次运行分开记录、不合并；`7.2s` 为 pi 的独立记录，`6.2s` 为主线程本轮最终浏览器结果。
- 覆盖 Chromium、WebKit、Firefox 三引擎的 desktop 与 narrow 视口，共 6 个 project。
- 使用未占用端口 `4221`，`reuseExistingServer: false`。

用例通过真实用户按钮完成 Approve、填写意见、Confirm，并断言：

- `transition` 恰好调用一次，`expectedVersion` 为 `2`、`comment` 为 `Keep receipt`、动作与幂等键精确，请求上下文为 `tenant-a` 且 `requestId === traceId`；
- 冲突提示位于 dialog 内，意见原样保留，dialog 未关闭；
- 原 `pending` 状态仍可见，不出现成功后的 `approved`；
- 点击 Cancel 退出后，再点击 Refresh 明确读回服务端 `current` 状态（`approved`），旧 `Approve` 动作消失；
- 用户意见在取消前始终保留，没有被静默清空。

截图共 12 张，位于：

```text
output/playwright/approval-center-conflict-20261022/
```

每个 project 各一张 `*-conflict.png` 与一张 `*-refreshed.png`。

主线程已抽查 `webkit-narrow-conflict.png`：意见、冲突提示与 Confirm/Cancel 均在视口内，未见明显文字遮挡。
该抽查仅为主观视觉核对，**不是读屏认证**，不能作为可访问性验收结论。

## 未验收边界

本轮浏览器证据使用本地受控内存 Provider 与真实 `ApprovalCenter` 组件交互，未连接真实审批服务。未验收真实审批
Provider、服务端版本冲突/幂等后端、真实 RBAC、租户/字段授权、历史一致性、
读屏、发布包或部署。不能据此宣称审批服务端并发冲突处理或权限边界已完成。
