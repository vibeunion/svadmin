# 数值公共入口双向绑定

## 续接任务

- parent：`enterprise-ui-plan.md` 批次二数值字段；
  source：用户要求继续完善直到全部完成；
  reason：`NumericInput` 声明了 `$bindable`，但公开 Number/Money/Percent
  包装层只透传 `value`，既有测试没有父组件绑定用例。
- 目标：三个公开入口支持 `bind:value` 双向传播，并保留
  `number | null`、金额原单位、百分比缩放和既有 `onchange` 契约。
- 非目标：不改精度舍入、区域格式、边界校验、Schema、数值解析或样式；
  不修复范围外类型问题，不发布或部署。
- 写入范围：三个包装组件、单个 numeric-input 测试文件及绑定 host、
  本证据、迁移说明、状态矩阵与计划入口；隔离验证产物位于忽略目录
  `output/playwright/numeric-input-binding-20261021/`。核心 `NumericInput` 不改动。
- 编排：medium / managed，主线程单写入，一名只读 verifier。
- 状态：本地修复、增强定向回归、局部类型检查和三视口浏览器走查通过；
  UI 包级检查及整体企业组件路线图不标记为完成。

```gherkin
Given 父组件使用 NumberInput、MoneyInput 或 PercentInput 的 bind:value
When 用户编辑字段
Then 父值同步更新且 onchange 仅执行一次，金额不换单位、百分比保留指定缩放

Given 父组件已经绑定非空数值
When 用户清空字段，随后输入零
Then 父值先为 null 再为数字 0，不混淆空值与零

Given 父组件更新或清空绑定值
When 三个公共控件重新渲染
Then 展示与父值一致，不因外部赋值重复触发 onchange
```

## 当前检查边界

- 数值旧测试 3/3、DatePicker 入口测试 2/2、TreeSelect 47/47 已逐文件通过；
  后两者只是本轮只读基线，不代表整个批次二验收完成。
- 首次 UI 包级类型检查报 13 项，其中 3 项属于新增数值测试的未收窄数组索引；
  其余 10 项位于本轮未修改的 SecurityLogPage、AuditTimeline、
  approval-action-card / builtin-safety-followup / primitive-recipe-defaults 测试
  与 PagePatternExample。只修正当前范围问题，不把包级检查记为通过。

## 最终验证

- `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts
  src/components/numeric-input.test.svelte.ts`（`packages/ui`）：7/7，退出 0。
  三个包装分别覆盖用户输入、清空、零值、回调次数，另覆盖父级赋值和清空。
- `bun x --no-install svelte-check --tsgo-experimental-api
  --tsconfig output/playwright/numeric-input-binding-20261021/tsconfig.json
  --threshold error`：0 errors / 0 warnings。配置继承现有 UI 严格配置，
  仅包含三个包装、NumericInput、绑定 host 和直接相关测试，没有放宽编译选项。
- 独立只读 verifier Bohr 未发现明确 P0/P1/P2 问题：
  既有单向值和 `onchange` 仍兼容，固定 mode 不可被覆盖，百分比无重复换算。
  复核者未修改文件或重复运行测试。
- 浏览器入口为输出目录中的 `App.svelte`，直接消费三个公共包装。
  用 `playwright-cli run-code --filename .../verify.js` 执行受控脚本；
  1440x900、1920x1080、390x844 三视口均完成真实键盘输入、清空/零值、
  Enter 触发父级赋值、父级清空；检查无文档横向溢出、无 `pageerror`。
- 共生成六张截图；已人工查看 `numeric-typed-1440.png` 和
  `numeric-parent-390.png`，字段、单位和操作没有明显遮挡。
  其余截图未逐张人工认证。测试宿主下方的值仅用于观察双向绑定。
- 本机 CLI 从 `/tmp` 执行，避免 npm 解析仓库 Bun override 的
  `EINVALIDTAGNAME`；没有修改依赖或锁文件。临时服务与浏览器已关闭。
- `git diff --check`：通过。

本轮没有重做精度舍入、区域数字解析、日期或完整表单验收，也没有构建/发布
整个 UI 包。包级检查中的范围外问题未处理；不以局部类型检查替代包级通过。
