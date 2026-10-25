# 日期与时间公开入口策略浏览器证据（2026-10-22）

- parent: `docs/evaluations/enterprise-ui-plan.md` 批次二 DatePicker /
  TimePicker / DateTimePicker / DateRangePicker
- source: 用户继续企业规范原目标；reason: 现有公开入口只覆盖父值绑定和基础
  跨浏览器输入，尚未用真实浏览器验收 `disabledDate`、范围逆序、受限快捷范围、
  夏令时 gap/fold 和宿主消歧策略
- scope: `scripts/fixtures/enterprise-ui/?view=date-time&policy=1`，
  Chromium/WebKit/Firefox，1440px 桌面与 390px 窄屏
- Delegation Decision: low / managed；主线程唯一 writer，生产组件只读，
  未提交、推送、发布或部署；无联网依赖

## 边界

- DatePicker / TimePicker / DateTimePicker / DateRangePicker 仍是原生
  `input[type=date|time|datetime-local]` 包装，不是自绘日历或时间面板。
- 未修改时区、夏令时、日期解析、精度或组件实现；gap/fold 预期取当前
  `packages/core/src/date-time.ts` 和 `date-time-input.test.svelte.ts` 已有
  确定值。
- fixture 使用本地计数和原生 `FormData`，不代表真实后端、真实 Provider、
  权限持久化或网络请求取消/超时。
- 本轮只运行日期时间专属 Playwright 配置，不运行全仓测试、typecheck、
  build 或发布流程。

## 页面与写入范围

- `DateTimePickerFixture.svelte` 增加 `policy=1` 分支；无该参数时继续渲染旧
  `BindingHost` 场景。
- 新增 `DateTimePolicyFixture.svelte`，直接消费四个真实公开组件。
- `date-time.spec.ts` 保留原 civil/instant 两场景，并新增三个策略场景。
- 本证据和计划记录仅追加；未改生产组件。

每个策略输入都有独立原生 `<form>`、提交计数、精确 `FormData` JSON 和
`onchange` 计数。测试使用真实 `fill`、真实按钮点击提交、原生 `<select>`；
受限快捷项通过 Playwright `selectOption` 尝试真实选择并因 option disabled
被拒绝，没有用 `dispatchEvent` 伪装用户可选择禁用项。

## 覆盖场景

1. **DatePicker disabledDate**
   - 初始 bound `2026-09-18`。
   - 真实填写 `2026-09-19` 后保留无效 draft，bound 仍为旧值，
     `onchange` 仍为 0，输入 `validity.customError=true`、
     `checkValidity()=false`，原生提交计数保持 0 且无载荷。
   - 修正为 `2026-09-20` 后 `onchange=1`，提交一次，精确载荷
     `{"booking":"2026-09-20"}`。
2. **DateRangePicker 逆序与快捷范围**
   - 初始 `{"start":"2026-09-10","end":"2026-09-20"}`。
   - start 填写逆序 `2026-09-25` 后保留 draft，bound 不变，
     `onchange=0`，自定义校验失败，原生提交被阻止。
   - 修正为 `2026-09-15` 后只更新 start，提交精确载荷
     `{"period.start":"2026-09-15","period.end":"2026-09-20"}`。
   - “Blocked day”“Reversed”两个 option 均为 disabled；真实
     `selectOption` 尝试均被拒绝，没有触发 `onchange`。
   - 选择“Working week”后两端原子更新为
     `{"start":"2026-09-14","end":"2026-09-18"}`，提交一次，精确载荷
     `{"period.start":"2026-09-14","period.end":"2026-09-18"}`。
3. **DateTimePicker instant / America/Los_Angeles**
   - gap：填写 `2026-03-08T02:30` 被拒绝，旧 bound 保留，校验失败、
     提交被阻止；修正为 `2026-03-08T03:30` 后提交
     `{"gapAt":"2026-03-08T10:30:00.000Z"}`。
   - fold 默认 reject：填写 `2026-11-01T01:30` 被拒绝，bound 仍为 null，
     校验失败、提交被阻止。
   - 宿主显式 `earlier`：提交
     `{"foldEarlierAt":"2026-11-01T08:30:00.000Z"}`。
   - 宿主显式 `later`：提交
     `{"foldLaterAt":"2026-11-01T09:30:00.000Z"}`。
   - 上述 UTC 值与现有 core/date-time 测试一致，未新增时区算法。

## 执行结果

```sh
cd scripts/fixtures/enterprise-ui
bunx playwright test -c playwright.date-time.config.ts --max-failures=1
```

- 结果：**30/30 passed**，退出码 0，耗时约 32 秒。
- 矩阵：5 个场景 × Chromium/WebKit/Firefox × 1440px/390px = 30。
  - 旧 BindingHost civil/instant 场景：12/12 保留通过。
  - 新增策略场景：18/18 通过。
- 覆盖真实 `checkValidity`、自定义校验、原生 submit 计数和精确 FormData，
  不只断言 UI 值。
- `git diff --check`：通过。

## 失败与观察

- 最终 30/30 无失败。
- 首轮新增测试有 1 条失败，原因是我方额外断言“选择有效 preset 后原生
  select 必须回到占位值”，实际组件保持选中项值 `"0"`。该断言不属于用户
  要求，也未弱化任何必需断言；删除后重跑全部通过。生产组件未因此修改。
- 观察：有效快捷范围选择后原生 select 仍显示所选 option，而非占位项；
  本轮不把该占位复位行为作为验收项，不宣称其为缺陷或已修复。

## 未覆盖

本证据不关闭真实后端/Provider、权限与持久化、网络取消/超时、读屏软件、
完整日历面板、发布包或生产部署验收；也不代表批次二整体完成。