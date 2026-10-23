# RadioGroup 原生 reset 同任务选择与确定性验证

## Task Contract

- parent：`docs/evidence/radio-group-browser-contract-20261022.md`；
  source：主线程恢复被中断的 B2-04 原生 reset 任务；
  reason：上一执行被主线程中断，其未知测试结果不能记为通过；当前源码与
  测试改动已存在，本轮保留并从现状继续。
- 目标：在同一单元测试文件增加确定性红测，验证 `form.reset()` 后同一任务
  内重新选择时以最后一次用户选择为准；确认存在覆盖问题后只做最小修复。
- 非目标：不重写已有 RadioGroup reset 用例，不改样式、依赖、公开 API、
  其他组件或全仓配置；不把 happy-dom 差异反推为原生浏览器标准；不提交、
  推送、部署。
- 写入范围：`packages/ui/src/components/RadioGroup.svelte`、
  `packages/ui/src/components/radio-group.test.svelte.ts`、
  `packages/ui/src/components/radio-group-isolation.test-host.svelte`、
  `scripts/fixtures/enterprise-ui/radio-group.spec.ts`、
  `scripts/fixtures/enterprise-ui/RadioGroupFixture.svelte`、本证据与
  `docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` 的 B2-04。
  其中 `radio-group-isolation.test-host.svelte` 与
  `scripts/fixtures/enterprise-ui/RadioGroupFixture.svelte` 为首轮已修改文件。
- 编排：medium / managed；当前执行者为唯一 writer，主线程为 reviewer。
- 验证命令：`packages/ui` 单文件 vitest、专属
  `playwright.radio-group.config.ts`、`git diff --check`；不运行全仓测试。

## Given / When / Then

```gherkin
Given 一个命名或未命名 RadioGroup 的初始值为 personal
When 用户先选择 company，随后在同一任务内执行 form.reset() 并立即重新选择 company
Then reset 的延迟冲刷不得把绑定值覆盖回 personal
And 最终绑定值、checked 与 FormData 都保持最后一次用户选择

Given 原生 reset 被 preventDefault
When reset 事件分发结束
Then 当前选择、绑定值和 FormData 保持不变

Given 两个实例的初始值分别为 company 与 null
When 各自 reset
Then 每个实例只恢复自己的初始快照，不串改共享表单或另一表单的实例
```

## 实际红测输出

先只加入测试、未修复源码时执行：

```text
bun run test src/components/radio-group.test.svelte.ts
❯ src/components/radio-group.test.svelte.ts (28 tests | 2 failed)
  × keeps the last same-task user selection after a native reset when named=false
  × keeps the last same-task user selection after a native reset when named=true
AssertionError: expected 'personal' to be 'company'
Expected: "company"
Received: "personal"
Tests  2 failed | 26 passed (28)
error: script "test" exited with code 1
```

该输出确认 `setTimeout(flushNativeReset, 0)` 在 `form.reset()` 后同一任务内的
`radio.click()` 之后执行，覆盖了新选择。

第一次最小修复（仅作废 pending reset）后，named=true 通过，但 named=false
仍暴露 DOM 残留：

```text
× keeps the last same-task user selection after a native reset when named=false
AssertionError: expected <input type="radio" …(4)></input> to have property "checked" with value false
- Expected
+ Received
- false
+ true
Tests  1 failed | 27 passed (28)
error: script "test" exited with code 1
```

原因是新选择与 reset 前的绑定值相同时 Svelte 不产生更新，而 happy-dom 对
未命名 radio 的 reset 默认动作仍留下旧 `checked`。修复时在作废 pending
reset 后显式调用已有的 `syncChecked()`，让 DOM 回到当前绑定值；真实浏览器
重复赋值无副作用，此修复不改变原生分组语义。

## 最终单元结果

以下结果按执行主体分开记录。

pi 执行：

```text
cd packages/ui
bun run test src/components/radio-group.test.svelte.ts
Test Files  1 passed (1)
Tests  28 passed (28)
exit 0
```

主线程独立执行，实际命令与结果：

```text
cd packages/ui
bunx vitest run --config ./vitest.config.ts src/components/radio-group.test.svelte.ts
Test Files  1 passed (1)
Tests  28 passed (28)
exit 0
duration 1.89s
```

覆盖检查：命名/未命名、初始非空/`null`、取消 reset、required validity
重建、共享表单实例隔离均由该文件现有 reset 用例与本轮新增用例实际覆盖。

## 浏览器结果

新增浏览器用例：reset 后同一页面任务内重新点击 company，随后用
`setTimeout(0)` 任务栅栏等待组件冲刷，再以行为断言等待最终值、checked、
FormData 和回调计数。`resetForm()` 也改为在页面内 reset 后等待一个
`setTimeout(0)` 任务栅栏，删除了 `waitForTimeout(20)`。

新用例先单独在 chromium-desktop 通过：

```text
bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.radio-group.config.ts \
  --project=chromium-desktop --grep "same-task selection"
1 passed (2.0s)
exit 0
```

专属配置完整矩阵（chromium/webkit/firefox × desktop/narrow）结果按运行分开记录：

- pi 默认 30s 完整运行，第 1 次：104 passed，3 skipped，1 failed；失败为
  firefox-narrow `native reset restores initial selections` 的 `beforeEach`
  `page.goto` 30s 超时，尚未进入行为断言。
- pi 默认 30s 完整运行，第 2 次：104 passed，3 skipped，1 failed；失败为
  firefox-narrow 另一个用例的同类 `beforeEach` `page.goto` 30s 超时。
- pi 默认 30s 完整运行，第 3 次：104 passed，3 skipped，1 failed；仍为
  firefox-narrow 的同类 `beforeEach` `page.goto` 30s 超时。
- pi 将 CLI 超时临时放宽到 60s 的完整运行：104 passed，3 skipped，1 failed；
  仍为 firefox-narrow `beforeEach` `page.goto` 60s 超时。
- `--project=firefox-narrow` 单独运行：18 passed (12.8s)，exit 0。

上述结果是四次完整运行分别各为 104 passed、3 skipped、1 failed，不是三次
运行合计。由于这些运行中失败发生在 `beforeEach`，对应用例未进入行为断言，
不能表述为“每次完整运行覆盖全部 reset”；只能确认其余已进入断言的用例如实
通过。首轮被中断的执行保留为历史记录，其结果不计为证据。

主线程独立最终复核，实际命令与结果：

```text
bunx playwright test --config scripts/fixtures/enterprise-ui/playwright.radio-group.config.ts --trace retain-on-failure --output output/playwright/radio-group-reset-review-20261022
105 passed、3 skipped、exit 0、1.1m
```

该复核使用原始配置：30s 超时、单 worker、retries 0。105 passed、3 skipped
覆盖全专属矩阵，3 skipped 为既有视口条件跳过，无失败。

Firefox 导航超时的原因尚未确认。不能据此宣称基础设施问题或并行抖动已经
根治；也不能仅凭本次主线程复核通过就宣称稳定性已关闭。

## 结论与剩余边界

- 已证明：原生 reset 后同一任务内的最后一次用户选择不会被延迟冲刷覆盖；
  取消 reset、初始非空/`null`、命名/未命名及共享表单实例隔离保持原契约。
- 仍开放：Firefox 导航超时根因未确认，基础设施或并行抖动未证明已根治；
  稳定性关闭需要额外证据，不能只依赖本次完整矩阵通过。
- 未证明：真实读屏、服务端授权、发布包消费、部署，以及所有可能控件组合的
  原生 reset 行为。
- 未修改：样式、依赖、其他组件、公开 API、全仓配置。
