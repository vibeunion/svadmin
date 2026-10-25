# 日期与时间公共入口双向绑定

## 任务边界

- parent：`docs/evaluations/enterprise-ui-plan.md` 批次二日期/时间字段；
  source：用户要求继续完善企业级公共组件；
  reason：底层 `DateTimeInput` 与 `DateRangeInput` 已有边界测试，但
  `DatePicker`、`TimePicker`、`DateTimePicker`、`DateRangePicker` 缺少真实
  父组件 `bind:value` 验收。
- 目标：验证四个公开入口的用户输入、清空、父级赋值、父级清空、
  range 两端 nullable key、拒绝逆序草稿、时间点表单序列化和 `onchange` 次数。
- 非目标：不改变日期解析、时区、夏令时、禁用日期、精度或样式；
  不宣称完整日历面板、跨浏览器、屏幕阅读器或真实服务端验收。
- 写入范围：一个测试 host、一个公共入口绑定测试、本证据和计划入口；
  隔离的本机浏览器证据保存在忽略目录
  `output/playwright/date-time-picker-binding-20261021/`。
- 编排：medium / managed，主线程唯一写入；Bohr 只读复核。
- 状态：本地公开入口回归和 Chromium 走查完成；整体目标继续进行。

## 验收场景

```gherkin
Given 父组件绑定四个公开日期/时间入口
When 用户编辑和清空单值或范围端点
Then 父值同步，空值保持 null，范围另一端不丢失

Given 父组件已经持有日期、时间、日期时间和范围值
When 父级重新赋值或清空
Then 控件展示与父值一致，且不触发 onchange

Given 日期时间入口声明 Asia/Shanghai 时区和 instant 模式
When 用户输入跨 UTC 日界的本地时间
Then 父值及原生 FormData 仅保留一个正确的 UTC 时间点

Given 日期范围已有有序端点
When 用户输入逆序端点后修正
Then 无效草稿保留且不提交，修正后只更新对应端点
```

## 当前结果

在 `packages/ui` 使用现有配置执行：

```sh
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/date-time-picker-binding.test.svelte.ts
```

- `date-time-picker-binding.test.svelte.ts`：4/4，退出 0；覆盖四个公开
  入口的输入、清空、父级赋值、父级清空、instant 转换和逆序范围恢复。
- 上一轮的只读基线：`date-time-input.test.svelte.ts` 23/23、
  `time-date-picker.test.svelte.ts` 2/2，均退出 0，见
  `ui-contract-type-recovery-20261021.md`。本轮未重复执行或改动这两个文件。
- `bun x --no-install svelte-check --tsgo-experimental-api
  --tsconfig packages/ui/tsconfig.json --threshold error`：0 errors / 0 warnings。
- `git diff --check`：通过。
- Chromium 本机走查：`output/playwright/date-time-picker-binding-20261021/verify.js`
  在 1440x900、1920x1080、390x844 三种视口分别运行 civil 和 instant 两种模式，
  共 6 组，全部通过；`pageErrors: []`。验证了 FormData 无重复字段、逆序范围
  阻止提交、修正后恢复、父级清空和午夜跨 UTC 日界转换。
- 已人工查看 `parent-instant-390.png` 和 `invalid-civil-1440.png`；
  未见字段、按钮、错误状态遮挡或文档横向溢出。其余截图未逐张人工认证。
- Bohr 独立只读复核：未发现 P0/P1/P2 阻塞。复核建议的全字段 FormData
  断言与范围对象比较已补齐；未修改组件实现或公共 API。
- 浏览器验证页直接消费上述测试 host 和四个公开组件源码；12 张截图和
  执行脚本保存在隔离输出目录。临时浏览器和 4199 端口服务已关闭。

本轮没有完成完整应用/消费者构建、跨浏览器与屏幕阅读器认证、真实 Provider
权限/持久化联调、提交、发布或部署；本证据不代表整个批次二或企业级路线图完成。

## 2026-10-23 只读核对：父值清空与禁用/快捷范围

- parent：`docs/evaluations/enterprise-ui-plan.md` 批次二 B2-02；
  source：用户要求继续核对“父值清空后控件清空”和既有禁用/快捷范围覆盖；
  reason：确认是否还存在明确源码契约缺口，避免重复补用例。
- Delegation Decision：low / managed；pi 主线程唯一 writer，主线程只读审查，
  未修改生产组件、未提交、推送、发布或部署。
- 写入范围：仅本证据和 `enterprise-ui-acceptance-matrix-20261022.md` 的 B2-02
  记录；未改测试或源码。

### 核对结论

- **父值清空**：`date-time-picker-binding.test.svelte.ts` 第 2 例先由父级赋值、
  再由父级设为 `null`，断言四个公开入口的原生输入全部为空且 `onchange` 未触发。
  该场景直接覆盖“父值清空后控件清空”，不是仅覆盖用户手动清空。
- **禁用日期**：底层 `date-time-input.test.svelte.ts` 已覆盖 `disabledDate` 保留
  无效 draft、旧 bound 不提交及修正后恢复；公开入口层面的浏览器证据
  `date-time-policy-browser-20261022.md` 已用真实 `DatePicker` 覆盖
  `disabledDate`、`checkValidity` 和原生提交阻止。
- **快捷范围**：底层 `date-time-input.test.svelte.ts` 已覆盖受限 preset 禁用、
  逆序/越界拒绝和有效 preset 原子更新；公开 `DateRangePicker` 已由 policy
  浏览器证据覆盖受限 option 不可选与有效 preset 两端原子更新。
- `date-picker.test.svelte.ts` 自身只覆盖入口类型与范围端点顺序，不承担
  `disabledDate`/preset 验收；这不是契约缺口，因为对应行为由上述底层单测和
  公开入口浏览器证据覆盖。
- 未发现明确源码契约缺口；未新增测试，避免与既有覆盖重复。

### 本轮实际结果

```sh
cd packages/ui && node ../../node_modules/vitest/vitest.mjs run \
  --config vitest.config.ts src/components/date-time-picker-binding.test.svelte.ts
```

- 结果：**4/4 passed**，退出码 0。
- `git diff --check`：通过。

未运行其他测试、typecheck、build、跨浏览器或部署流程；读屏、真实后端和
新分发包仍为外部验收。
# 主线程续轮复核

- 独立运行 `packages/ui` 下 `bunx vitest run --config ./vitest.config.ts src/components/date-time-picker-binding.test.svelte.ts`：4/4 passed、exit 0、704ms；`git diff --check` exit 0。
- 已检查父值赋值/清空用例，覆盖日期、时间、日期时间和范围两端清空且无输入回调。本轮未改生产或测试，未重跑日期策略浏览器证据，不证明真实后端、读屏或发布。
