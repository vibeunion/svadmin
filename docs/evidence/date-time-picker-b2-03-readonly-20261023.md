# B2-03 TimePicker / DateTimePicker 只读核对与禁用入口回归（2026-10-23）

- parent：`docs/evaluations/enterprise-ui-plan.md` 批次二 B2-03；
  source：用户要求继续 `TimePicker`/`DateTimePicker`，只读核对独立键盘、禁用、
  清空、跨日；reason：确认是否还有明确契约缺口，避免外推日期策略浏览器结果。
- Delegation Decision：low / managed；pi 主线程唯一 writer，主线程只读审查；
  未修改生产组件、未提交、推送、发布或部署。
- 写入范围：`packages/ui/src/components/time-date-picker.test.svelte.ts` 增加一条
  最小入口级禁用回归；本证据和 `enterprise-ui-acceptance-matrix-20261022.md`
  的 B2-03 记录。未改 `TimePicker`、`DateTimePicker`、`DateTimeInput` API。

## 只读核对结论

- 源码结构：`TimePicker` 与 `DateTimePicker` 都只是把 props 转发给
  `DateTimeInput`，分别固定 `mode="time"` 和 `mode="datetime"`；没有独立自绘
  面板、独立键盘处理或额外的日期策略分支。
- **清空**：现有 `date-time-picker-binding.test.svelte.ts` 已覆盖用户清空和父级
  置空，四个公开入口都不触发 `onchange`；本轮复跑 4/4。
- **跨日**：同一绑定测试的 instant 场景把上海时间 `2026-09-22T00:30` 转为
  `2026-09-21T16:30:00.000Z`，已覆盖本地日期跨日与 UTC 日界转换；DST
  gap/fold 仍只引用既有 policy 浏览器证据，本轮未复跑、未外推。
- **禁用**：源码完整转发 `disabled`，`DateTimeInput.handleInput` 在禁用时直接
  返回；但公开入口此前没有单测锁定该契约。本轮补一条最小回归，验证
  `TimePicker`、`DateTimePicker` 的 `disabled` 属性透传，以及合成 `input`
  事件不触发 `onchange`。
- **独立键盘**：两个入口仍是浏览器原生 `input[type=time|datetime-local]`；
  没有项目自定义键盘契约。jsdom 合成键盘事件不能证明真实键盘操作，本轮不
  新增伪键盘测试，也不把浏览器键盘矩阵标为已验收。
- 未发现需要修改生产源码的明确契约缺口；因此没有改组件实现，也没有设计新 API。

## 新增回归

`packages/ui/src/components/time-date-picker.test.svelte.ts` 新增：

- `forwards disabled and suppresses callbacks for synthetic input events`
- 断言 `TimePicker`、`DateTimePicker` 输入框 `disabled=true`；
- 对禁用输入触发合成 `input` 后 `onchange` 均未调用。

该测试只锁定属性透传与合成 `input` 回调抑制两项契约：测试环境直接设置 DOM
值时可能绕过原生禁用行为，因此不断言合成事件后的 DOM `value`，也不宣称绑定
草稿未发生变化；合成事件不代表真实键盘操作，本用例不证明真实键盘行为。

## 本轮实际结果

```sh
cd packages/ui && node ../../node_modules/vitest/vitest.mjs run \
  --config vitest.config.ts src/components/time-date-picker.test.svelte.ts
```

- 结果：**3/3 passed**，退出码 0，615ms。

```sh
cd packages/ui && node ../../node_modules/vitest/vitest.mjs run \
  --config vitest.config.ts src/components/date-time-picker-binding.test.svelte.ts
```

- 结果：**4/4 passed**，退出码 0，703ms。
- `git diff --check`：通过。

未运行其他测试、typecheck、build、浏览器矩阵或部署流程；真实键盘、读屏、
真实后端、新分发包和部署仍为外部验收。
## 主线程独立复核

- 修正用例名与证据边界后，在 `packages/ui` 独立执行 `bunx vitest run --config ./vitest.config.ts src/components/time-date-picker.test.svelte.ts`：3/3 passed、exit 0、612ms；`git diff --check` exit 0。
- 审查确认仅为 disabled 属性透传与合成 input 回调抑制，不证明绑定草稿未变或真实键盘行为。没有生产改动。
