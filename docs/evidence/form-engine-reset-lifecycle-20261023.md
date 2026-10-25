# AutoForm / StepsForm 显式 reset 生命周期证据（2026-10-23）

## 最新主线程浏览器复核

- 独立执行 `scripts/fixtures/enterprise-ui` 下 `bunx playwright test --config=./playwright.form-reset.config.ts`：10/10 passed，exit 0，6.0s；`git diff --check` exit 0。与 pi 的 10/10、9.8s 分开记录。
- 已审查真实组件挂载、`bind:this` 公共方法调用、默认值恢复、校验反馈清除、步骤恢复和写入/导航/成功回调计数。按钮属于测试宿主，不是新增产品功能。
- 只读/拒绝场景证明可见状态保持且没有写入、导航和成功回调，不单独证明内部状态完全未变。此浏览器组没有在途写入，不证明迟到响应隔离；仍不覆盖 Firefox/WebKit、真实后端或读屏。

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

## 5. 运行证据边界

本轮实际执行：

```text
cd packages/ui
bunx vitest run --config ./vitest.config.ts src/components/form-engine-reset.test.svelte.ts
```

- pi 结果：`Test Files 1 passed (1)`、`Tests 10 passed (10)`、原始 exit code `0`、
  duration `7.27s`。
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

未覆盖边界：StepsForm 没有 `show` 只读模式，故只验证拒绝 no-op；未覆盖
webkit/firefox、真实读屏、真实后端取消/幂等、发布与部署。
