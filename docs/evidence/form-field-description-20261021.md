# 字段说明与错误关联续接

## 任务约定

- parent：`form-field-identity-20261021.md`；source：继续完成既有 FormField 规范。
- reason：当前字段模型缺少说明文本，内置控件只关联错误，无法统一呈现说明和错误。
- goal：增加可选 `FieldDefinition.description`，由 FieldRenderer 渲染为纯文本、
  生成实例级说明 ID，并与既有 errorId 合并，不覆盖错误关联。
- 非目标：不改变校验、原生提交值或名称，不重写没有描述属性接口的复合控件、
  不自动连接自定义 children 内部节点，不宣称读屏或所有字段验收完成。
- 风险与协作：medium / managed；当前线程唯一 writer，Bohr 只读复核。
- 写入：core 字段类型、FieldRenderer、同一表单可访问性测试及本说明/迁移/路线图。
- 当前环境没有 agmesh，使用本文记录续接。不开新发布、不提交或推送。

## 验收

```gherkin
Given 字段同时有说明和错误
When 内置控件渲染
Then 描述关联同时保留说明与错误 ID，且说明为纯文本

Given 同页两个字段实例使用相同业务键
When 宿主读取描述关联
Then 说明 ID 不重复且只引用当前实例

Given 宿主增加、更新或移除说明
When 组件更新
Then 描述关联随之更新，未设置说明时维持原错误协议
```

## 执行状态

- 定向命令（在 `packages/ui`）：
  `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/auto-form-accessibility.test.svelte.ts`。
- 首次 28/41：新增参数化测试漏接 type 参数，修正测试后 41/41；
  这不是生产组件失败基线。
- Bohr 首次只读复核发现 description 业务字段与说明 ID 冲突。
  内置 control ID 改为独立角色后缀；补 description/label/control 字段键、
  无说明无错误移除属性、日期范围及多选描述链回归后 **47/47**。
- 说明使用文本插值、沿用既有文本样式；未增加颜色、主题或 CSS 规则。
- `git diff --check` 通过。最终独立复核确认 P2 已关闭，未发现新增明确 P0/P1/P2。
- 未覆盖 ArrayField、TreeSelect、Cascader、Transfer、FileUpload 的内部描述链，
  这些入口仅可显示说明，不宣称描述关联完成。自定义 children 仍由宿主负责。
- 未进行真实浏览器、读屏、全仓类型检查或消费者构建，不提交或发布。
