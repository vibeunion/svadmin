# 数组字段反馈与禁用续接

## 任务约定

- parent：`form-field-description-20261021.md`；source：继续完成既有 FormField 规范。
- reason：ArrayField 未接收父字段 disabled，数组增删与嵌套字段仍可修改；
  也没有命名分组和父字段说明/错误描述关联。
- goal：增加 disabled 与分组描述属性；FieldRenderer 透传父字段状态；
  禁用增删/子字段更新，禁用 JSON 隐藏输入退出原生提交，恢复后使用最新受控值。
- 非目标：数组行身份/重排、原生多层数据编码、Schema 校验、布局重做、
  Transfer/关系选择器或 AutoForm 首错焦点策略。
- medium / managed；当前线程唯一 writer，Bohr 唯一只读 verifier。
- 写入：ArrayField、FieldRenderer、单一定向测试及规范证据；无 agmesh，
  本文记录续接。不提交、推送、发布或部署。

## 验收

```gherkin
Given 数组字段有说明与错误
When 渲染多个表单实例
Then 每个数组分组只关联本实例标签和描述

Given 数组字段被父表单禁用
When 点击增删或触发子字段更新
Then 所有操作禁用且不调用 onchange，嵌套数组同样受保护

Given 宿主禁用期间更新数组值后重新启用
When 用户增删或修改字段
Then 操作基于最新数组值，保留既有默认值与提交字段名
```

## 状态

- 定向命令（在 `packages/ui`）：
  `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/array-field-feedback.test.svelte.ts`。
- 首轮 5/5，补充独立使用、动态禁用恢复和原生提交后最终 **8/8**。
- 覆盖父级说明/错误分组、同页实例隔离、增删/子字段禁用、嵌套数组传播、
  受控值更新、默认值、隐藏 JSON 提交字段和启用时不可变回调。
- Bohr 只读复核未发现明确 P0/P1/P2；按建议补充恢复属性和外层 label 无 `for` 断言。
- `git diff --check` 通过。本轮局部契约完成；数组行重排、复杂嵌套提交、
  真实浏览器/读屏、全仓类型检查和消费者构建未完成。
