# 表单字段实例标识续接

## 任务约定

- parent：`enterprise-ui-plan.md` 批次二 FormField / ErrorSummary。
- source：用户要求继续直到既有范围全部完成。
- reason：错误总览已完成局部验证，但 FieldRenderer 使用业务字段键作为 DOM ID，
  多个相同资源表单可能将标签关联到另一个表单的控件。
- goal：分离字段提交名与控件实例标识，修复既有控件 ID 和 label/group 关联。
- 非目标：不改校验算法、业务字段键、帮助文本协议、未提供 ID 接口的复合控件、
  自定义字段渲染器或表单布局；这些不因此视为完成。
- 风险与协作：medium / managed；当前线程唯一 writer，Bohr 唯一只读 verifier。
- 验证：仅执行直接相关单文件测试及 `git diff --check`；不提交、推送或发布。
- 当前环境没有 `agmesh`，本文记录续接范围与恢复状态。

## 验收场景

```gherkin
Given 页面渲染两个相同资源表单
When 宿主读取字段标签关联
Then 每个标签只关联所在表单的控件且 DOM ID 不重复

Given 表单字段有业务字段键
When 控件使用实例级 DOM ID
Then 原生 name 与提交数据中的业务字段键保持不变

Given 同页两个表单均校验失败
When 用户激活某个表单的错误总览
Then 焦点和错误描述仍属于该表单
```

## 验证状态

- 单文件命令（`packages/ui`）：
  `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/auto-form-accessibility.test.svelte.ts`。
- 失败基线 3/4：第二个 AutoForm 的 label.control 指向第一表单控件。
- 实例级 ID 修复后基础回归 4/4；扩展同一文件分支覆盖后最终 27/27。
- 覆盖内置文本/数字/日期/布尔/颜色/文件/多选、图片 URL、大选项集 select、
  默认与显式 ID、日期范围两端、原生 name、自定义 children 兼容和 AutoForm
  既有错误定位、校验及成功提交。
- Bohr 首次只读复核指出 children 默认标签关联兼容性问题，已保留该分支的原字段键
  目标与标签 ID，显式 id 优先，并补回归。第二次只读复核确认 P2 关闭，
  未发现新增明确 P0/P1/P2；`git diff --check` 通过。
- 本轮本地实现与定向验证已完成，整体 FormField 和企业级规范目标仍未完成。
- relation 与已注册富文本编辑器未单独执行回归；富文本只覆盖 textarea 降级路径。
  无 ID 接口的复合控件、帮助文本、真实浏览器和读屏软件验收仍未完成，
  未执行全仓类型检查、消费者构建或发布。
