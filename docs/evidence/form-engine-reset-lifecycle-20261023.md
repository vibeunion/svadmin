# AutoForm / StepsForm 显式 reset 生命周期证据（2026-10-23）

## 最新主线程浏览器复核（2026-10-24）

- 主线程独立执行 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.form-reset.config.ts`：**36/36 passed、exit 0、27.5s**；配置为 Chromium/WebKit/Firefox × desktop/narrow，每项目 6 个场景。pi 前一轮独立结果为 36/36、27.8s，分开记录、不合并计数。
- 当前矩阵保留 5 个既有场景并新增 1 个关闭保护场景，详见第 9 节；第 7 节 10/10 Chromium 两视口保留为历史记录，不作为当前跨引擎结论。
- 已审查真实组件挂载、`bind:this` 公共方法调用、默认值恢复、校验反馈清除、步骤恢复、关闭保护退休和写入/导航/成功回调计数。按钮属于测试宿主，不是新增产品功能。
- 只读/拒绝场景证明可见状态保持且没有写入、导航和成功回调，不单独证明内部状态完全未变。此浏览器组没有在途写入，不证明迟到响应隔离；仍不覆盖真实后端或读屏。

## 1. 范围与结论

本证据只覆盖 `packages/ui` 的 `AutoForm.svelte`、`StepsForm.svelte` 及其对 Core
`useContractForm` / `useStepsForm` 既有 `reset()` 语义的消费，不修改 Core，也不新增
真实后端取消、读屏、浏览器矩阵或发布结论。

- 本轮代码 writer：pi。
- 审查方式：managed 主线程独立审查。
- 生产代码改动：首轮在 AutoForm 与 StepsForm 新增 `export function reset()`，
  通过 `bind:this` 暴露；后续边界补测阶段未再改生产代码。Core 未修改。
- 本轮唯一测试命令只运行 `packages/ui/src/components/form-engine-reset.test.svelte.ts`。
- 本轮结果：pi 单文件 **10/10**、原始 exit code **0**、duration **7.27s**；
  `git diff --check` 原始 exit code **0**。
- 新版本状态：主线程独立复核 **10/10、exit 0、6.91s**，diffcheck exit 0。

## 2. 首版结果与验证方式变更

- 首版主线程组合验证记录：相关 **5 个文件 239/239**、原始 exit code **0**、
  总 duration **24.20s**，已通过。
- 该 239/239 是首版组合运行的历史结果，本轮按要求没有复跑，也不把历史数字当作
  新版本单文件结果。
- 用户既有要求为日常验证只跑相关单文件，首版组合执行偏离该要求，后续已纠正。
- 本轮因此只重跑 `form-engine-reset` 单文件；新增边界断言后结果为 10/10、exit 0、
  7.27s。
- 首版主线程五文件为 form-engine-reset、auto-form-host-lifecycle、
  auto-form-accessibility、form-contract、steps-contract。新增 reset 边界后的
  主线程验证仅运行 form-engine-reset 单文件，10/10、exit 0、6.91s。
- auto-form-host-lifecycle 使用真实 QuickEditDrawer，经宿主卸载后挂载记录 2，
  再结算记录 1 的旧成功回执，验证新草稿与抽屉保留且不调用旧 onClose；
  不代表提交中普通关闭按钮可用，也未覆盖旧失败回执的同一宿主路径。

## 3. 确切契约

### 3.1 UI 入口

`AutoForm.reset()`：

1. `!allowed || isReadonly` 时直接返回，不清理提交令牌或提示，不写 Core。
2. 否则清空本实例 `submission` 与 `submitError`。
3. 调用 Core `form.reset()`。
4. 不主动导航；不触发成功回调；不改变权限或只读状态。

`StepsForm.reset()`：

1. `!allowed` 时直接返回，不清理提交令牌或提示，不写 Core。
2. 否则清空本实例 `submitError`、`submission` 与 `confirmation`。
3. 调用 Core `form.reset()`；`useStepsForm.reset()` 再恢复步骤导航到第一步。
4. 不主动导航；不触发成功回调；不改变权限状态。该组件没有 `show` 只读模式。

### 3.2 Core reset 语义

`packages/core/src/contract-form.svelte.ts` 的 `reset()` 当前行为是：

1. 退休当前本地的草稿修订标记、在途回执令牌和提交中状态：
   `draftRevision = {}`、`active = undefined`、`latest = undefined`、
   `submitting = false`。
2. 若表单不处于可写且已水合状态，则到此为止，不修改草稿。
3. 可写且已水合时，恢复 `initial` 草稿，并清空 `tainted`、字段错误和表单级错误。

因此 reset 的准确含义是**退休本地回执，不是取消已经派发的 HTTP 写请求**。Provider
请求仍可能完成；已派发的旧请求仍可能执行审计、live 发布和自有查询失效。它们不能
再更新 reset 后的草稿、草稿基线、tainted、字段/表单错误、成功/失败通知、业务回调
或触发导航。

### 3.3 在途成功/失败隔离

旧提交在 reset 后返回时，Core 以 `active` / `latest` 令牌不匹配判定为
`FORM_CANCELLED`：

- 不把旧服务端记录合并进新草稿；
- 不把旧记录的基线写回 `initial`；
- 不把旧失败映射到新草稿的字段错误或表单错误；
- 不触发 `onMutationSuccess` / `onMutationError`；
- 不触发成功/失败通知或导航；
- 旧 promise 的 `finally` 不会清掉 reset 后新提交的 `submitting`，因为新提交持有
  不同令牌。

reset 后的新提交会创建新令牌，旧回执不能与它 joined。旧成功晚到不得覆盖新提交已
确认的草稿，旧失败晚到不得污染新草稿。

### 3.4 权限与只读 no-op

- AutoForm 在 `mode="show"`（只读）时 `reset()` 不写 Core；显示值保持，仍无保存入口。
- AutoForm/StepsForm 在访问控制拒绝、`allowed === false` 时 `reset()` 不写 Core；
  拒绝提示和页面状态保持不变。
- 该 no-op 是边界保护，不表示未授权用户可以通过 reset 绕过权限，也不表示只读模式会
  清空草稿。

## 4. 新增直接断言

文件：`packages/ui/src/components/form-engine-reset.test.svelte.ts`

Harness：`packages/ui/test/fixtures/FormEngineResetHarness.svelte`

Harness 使用真实 `AdminApp`、`provideAdminContext`、`QueryClient`、受控本地
`DataProvider`、真实 `AutoForm` / `StepsForm`。写入由测试显式 resolve/reject，以便
制造 reset 前后的在途成功与失败；同时记录导航次数和成功回调次数。访问控制由
受控 `can` 返回允许/拒绝。

1. AutoForm 基础 reset：恢复基线与描述，清理字段错误和错误摘要。
2. StepsForm 基础 reset：回到第一步，恢复基线；再次前进后第二步值也是基线。
3. AutoForm 在途旧成功晚于新提交完成：旧回执不覆盖新草稿，不增加成功回调或导航。
4. AutoForm reset 后旧成功先到：仍保持基线，不回调、不导航。
5. AutoForm reset 后旧失败晚到：新草稿保持 reset 后输入值，无错误摘要/旧失败文案，
   不回调、不导航。
6. StepsForm 在途旧成功晚于新提交完成：新服务端值保留，不增加成功回调或导航。
7. StepsForm reset 后旧失败晚到：第一步新草稿保留，不显示旧失败，不回调、不导航。
8. AutoForm `show` 只读 reset no-op：字段保持禁用和基线值，无保存按钮，不回调、不导航。
9. AutoForm 授权拒绝 reset no-op：拒绝提示保持，不出现表单字段，不回调、不导航。
10. StepsForm 授权拒绝 reset no-op：拒绝提示保持，不出现表单字段，不回调、不导航。
11. AutoForm reset 退休已打开的关闭保护（最终审查轮新增）：旧、新导航使用两个独立
    `vi.fn()`；dirty 后打开旧 guard，reset 后弹窗关闭、值回基线且旧 0；再次 dirty
    打开新 guard，确认后新 1、旧仍 0，弹窗关闭。

## 5. 运行证据边界

本轮实际执行：

```text
cd packages/ui
bunx vitest run --config ./vitest.config.ts src/components/form-engine-reset.test.svelte.ts
```

- 当时 pi 结果：`Test Files 1 passed (1)`、`Tests 10 passed (10)`、原始 exit code
  `0`、duration `7.27s`（该轮尚未包含关闭保护用例）。
- `git diff --check`：原始 exit code `0`。
- 未运行其他测试文件、未组合跑多文件、未运行浏览器/读屏、未调用真实后端。

这些断言证明的是 UI 与 Core 既有 reset 契约下的本地回执隔离和 no-op 边界，不证明：

- 真实后端取消或幂等；已派发请求仍可能成功；
- 服务端事务回滚；
- 屏幕阅读器、跨浏览器或真实视口表现；
- 分发包、部署和发布验收。

## QuickEditDrawer 关闭策略审查纠正

本轮首版 pi 将 `AutoForm` 提交中关闭保护改为允许离开，并增加两条相应测试。
主线程曾独立运行该中间版得到 3/3、exit 0、6.12s，但后续审查撤回通过结论：
该修改为了满足测试假设改变所有 AutoForm 宿主的既有关闭策略，超出本轮边界。
上述数字仅为已否决中间版运行记录，不是最终验收证据。pi 提供的红测摘要
`1 failed | 2 failed` 格式不明确，不用作有效测试计数或生产缺陷证明。

正确验收应区分提交中普通关闭保护、失败后脏草稿确认关闭、宿主强制卸载后的旧
成功/失败隔离。不得将提交中保护本身认定为故障，也不把外层 QuickEditDrawer
宿主仍存在等同于其内部 AutoForm 未卸载。

返修最终状态：AutoForm 恢复本轮前 `if (form.submitting) return;`，
测试宿主移除 `replacementRecordId` 临时 API；只保留生命周期单文件新增测试。
pi 单文件 4/4、exit 0、6.16s；主线程独立复跑 4/4、exit 0、6.35s。
主线程目标文件 `git diff --check` exit 0。两次运行独立记录，不合并。

直接覆盖：

- 在途保存时点击 Close，原抽屉仍在，关闭回调为零；
- 保存失败后 Close 显示真实未保存确认，确认前不关闭，确认后只关闭一次；
- 宿主强制卸载后，旧成功或旧失败返回不覆盖替换实例草稿、不显示旧错误、
  不触发关闭回调；保留原成功用例，新增失败用例。

测试使用受控 Provider 和 happy-dom；未断言导航或真实通知服务，未运行浏览器。
不证明普通关闭后仍有在途提交，也不证明服务端取消、回滚、幂等或完整 B2-10。

## 6. 主线程复核

主线程同一单文件 **10/10、exit 0、6.91s**，`git diff --check` exit 0。
与 pi 的 10/10、7.27s 和首版组合结果分别记录。
本轮成功竞态测试覆盖新写先完成、旧写后完成；旧写先于仍在途的新写完成时
保持 submitting 的分支是源码审查结论，未在此单文件直接断言。

## 7. 真实浏览器消费证据（2026-10-23 续轮）

为补最小真实浏览器消费证据，新增独立 fixture/route/spec/config，直接挂载真实
`AutoForm` / `StepsForm`，通过 `bind:this` 调用公开 `reset()`。产品表单仍未提供
reset 按钮；fixture 上的 `Call host reset` 按钮只是测试 harness 的受控调用入口，
不是产品 UI。

文件：

- `scripts/fixtures/enterprise-ui/FormResetBrowserFixture.svelte`
- `scripts/fixtures/enterprise-ui/App.svelte`（新增 `?view=form-reset` route）
- `scripts/fixtures/enterprise-ui/form-reset.spec.ts`
- `scripts/fixtures/enterprise-ui/playwright.form-reset.config.ts`

运行命令（在 `scripts/fixtures/enterprise-ui` 下）：

```text
testMatch: form-reset.spec.ts，chromium desktop/narrow，port 4194
bunx playwright test --config=./playwright.form-reset.config.ts
```

实际结果：**10/10 passed、原始 exit code 0、duration 9.8s**；
`git diff --check` 原始 exit code **0**。

浏览器断言：

1. AutoForm create：基线 `Baseline` / `Baseline description`；填入非基线值并触发
   必填错误后调用 reset，值与 `aria-invalid` 恢复、错误摘要移除，写入/导航/成功
   回调均为 0。
2. StepsForm create：第一步改为非基线值，进入第二步再改写；reset 后回到第一步且
   第一步值为基线、第二步字段不在 DOM；再次 Next 后第二步值也是基线，写入/导航/
   成功回调均为 0。
3. AutoForm `mode="show"`：字段 disabled、无 Save 入口；reset 后值与 disabled
   保持，写入/导航/成功回调均为 0。
4. AutoForm 访问控制拒绝：保持 `Operation failed` alert、无字段；reset 后 alert
   与无字段状态保持，无写入/导航/成功回调。
5. StepsForm 访问控制拒绝：同上。
6. 每个用例都断言产品表单作用域内不存在名称含 `reset` 的按钮，确认证据不是
   虚构产品入口。

未覆盖边界（2026-10-23 历史记录）：StepsForm 没有 `show` 只读模式，故只验证
拒绝 no-op；该轮未覆盖 webkit/firefox、真实读屏、真实后端取消/幂等、发布与部署。
webkit/firefox 的 reset 场景已由第 9 节 2026-10-24 矩阵补充，不再以本段作为当前跨引擎结论。

## 8. AutoForm reset 关闭保护最终回归（2026-10-24 收口）

- 生产最小改动（主线程已审查）：`AutoForm.reset()` 在允许且非只读时，除清空
  `submission`/`submitError` 并调用 Core `form.reset()` 外，同时设置
  `confirmOpen = false`、`pendingNavigation = null`，使 reset 前的关闭保护弹窗与
  其捕获的待执行导航一起退休。未改 StepsForm、ModalForm、DrawerForm 或 Core。
- 测试仅改 `packages/ui/src/components/form-engine-reset.test.svelte.ts` 单文件新增
  用例，未改其他测试或生产码。旧、新导航改为两个独立 `vi.fn()`，不再共用一个
  计数变量，因此能证明 `reset` 后旧 action 未被后续确认执行，而不是只观察总数。
- 断言顺序：dirty → 旧 guard 打开 → reset → 弹窗关闭、值回基线、旧 0；再次 dirty
  → 新 guard 打开 → Confirm → 新 1、旧仍 0、弹窗关闭。
- 唯一运行命令：
  `bun run --cwd packages/ui test src/components/form-engine-reset.test.svelte.ts`
  pi 结果：1 文件通过，**11/11**，exit code **0**，duration **7.52s**。
- 主线程此前已审查上述生产最小改动，并记录组合 **15/15**、**8.39s**；该组合数字
  是历史记录，不替代本次单文件 11/11，也不合并计数。
- 主线程随后独立复验同一单文件：**11/11**，exit code **0**，duration **7.50s**。
- 因此本条本地回归现已由主线程确认；该结果仍不覆盖真实服务、读屏、跨浏览器、
  分发包与部署。

未覆盖：真实服务、真实读屏、跨浏览器、分发包与部署；也不证明后端取消/回滚/幂等。

## 9. 三引擎双视口浏览器矩阵与关闭保护场景（2026-10-24）

- 本轮只修改测试文件：`scripts/fixtures/enterprise-ui/FormResetBrowserFixture.svelte`、`form-reset.spec.ts`、`playwright.form-reset.config.ts`；未改生产代码、配置安装树或产品入口。
- 专属配置扩展为 Chromium/WebKit/Firefox × desktop（1440×1000）/narrow（390×844），保留既有 5 个场景，新增 1 个“reset 退休已打开未保存保护”场景；每项目 6 个场景，共 **36 cases**。
- 主线程独立运行 `bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.form-reset.config.ts`：**exit 0、36/36 passed、27.5s**。pi 前一轮独立为 36/36、27.8s，两次为独立运行，不合并或相加计数。
- 新增场景断言链：真实 dirty 输入 → 公开未保存保护打开 `alertdialog` → 通过明确的 test-only DOM event（`window.dispatchEvent(new Event('svadmin:form-reset-call'))`）调用真实 `bind:this.reset()`，不 force click、不读取 Svelte 内部状态 → 弹窗关闭、值与描述恢复基线、旧导航保持 0、无 write/success；再次 dirty 后 Confirm 仅执行新导航 1 次、旧导航仍 0，且表单继续可编辑，`pageerror` 为空。
- 旧、新导航使用独立计数器分别断言，不使用合计计数掩盖旧 action 被执行。
- 主线程审查发现旧文件未使用的 `fixture()` helper 造成 lint 问题，已由本 writer 删除；仅清理未使用代码，不改变运行时行为。
- 边界：该测试宿主入口不是产品 reset 按钮，也不是真实 router 跳转；narrow 视口仅用于既有布局回归，不是新增视觉或移动端验收。该矩阵不证明真实服务、RBAC、读屏、分发包或发布。第 7 节 10/10 Chromium 两视口为历史记录；当前跨引擎结论以本节 36/36 为准。
