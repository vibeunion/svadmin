# RadioGroup 与 SegmentedControl 公共绑定

## 任务边界

- parent：`docs/evaluations/enterprise-ui-plan.md` 批次二选择控件；
  source：用户要求继续完善企业级公共组件；
  reason：两个公开入口已有局部交互测试，但缺少真实父组件绑定、
  外部赋值/清空和表单语义的消费者回归。
- 目标：验证用户选择回写、禁用选项不产生回调、键盘导航、父级赋值/清空
  不重复触发 `onchange`，以及 RadioGroup 的唯一表单值。
- 非目标：不改变视觉样式、选项排序、路由导航或选择器异步数据协议。
- 写入范围：一个测试 host、一个绑定测试、本证据和
  `SegmentedControl` 对未选择绑定值的公开类型修正及现有类型消费者测试；
  计划入口补充本证据链接。
- 编排：medium / managed，主线程唯一写入；Bohr 只读复核。
- 范围续接：基础绑定测试通过后，严格检查复现两项消费者类型错误。
  本任务依据同一用户目标增加上述单行公开类型修正，保留所有原有验收和非目标。
- 状态：本地修复、直接相关回归与独立复核完成；整体目标继续进行。

## 验收场景

```gherkin
Given RadioGroup 与 SegmentedControl 由父组件绑定
When 用户点击、键盘移动或选择禁用项
Then 只有有效选择回写并触发一次 onchange

Given 父组件持有选择值
When 父级赋值或清空
Then 控件状态同步，且不模拟用户操作触发 onchange

Given RadioGroup 已命名并放入表单
When 表单序列化
Then 未选择时无值，选择后只有当前选项一个值
```

## 当前结果

- `choice-binding.test.svelte.ts`：2/2，退出 0；覆盖 RadioGroup 用户选择、
  禁用选项、FormData 单值、SegmentedControl 键盘导航、父级赋值和清空。
- `segmented-control.test.svelte.ts` 与 `radio-group.test.svelte.ts`：9/9，
  退出 0；原有键盘、RTL、不可用选项和严格消费者测试保持通过。
- 初次包级严格检查复现了 2 项真实消费者错误：`SegmentedControl` 的
  `value?: T` 不能绑定 `T | undefined`，且回调泛型随之退化为 `string`。
  将公开 Props 改为 `value?: T | undefined` 后：
  `bun x --no-install svelte-check --tsgo-experimental-api
  --tsconfig packages/ui/tsconfig.json --threshold error` 为 0 errors / 0 warnings。
- 现有 `segmented-control.test.svelte.ts` 已增加一个 `Mode | undefined`
  消费者，确保该公开类型契约持续编译。
- `git diff --check`：通过。
- Bohr 独立只读复核：未发现明确 P0/P1/P2 阻塞。按复核建议增加 RadioGroup
  完整回调序列和最后一次回选的父值断言；绑定测试重新执行 2/2 通过。
- `svelte2tsx/index.js.map` 缺失产生既有 source-map 提示，未导致测试失败；
  未修改依赖、屏蔽错误或放宽测试断言。

本轮没有完成异步 Select/MultiSelect/AutoComplete、实体授权选择器、跨浏览器
与读屏认证、完整消费者构建、真实服务联调、提交、发布或部署；本证据不代表
选择器整批、批次二或企业级路线图完成。

本测试宿主只包含一个 RadioGroup 实例，不能据此证明多实例标签 ID/分组隔离
或真实浏览器的原生方向键导航，这些仍需单独验收。
