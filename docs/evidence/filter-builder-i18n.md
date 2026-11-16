# 高级筛选逻辑与操作符本地化

目标：业务人员看到可读且与查询一致的条件；宿主可以按字段约束真实能力。
范围：FilterBuilder 的文案、单选项呈现、字段操作符白名单及时间字段比较。保留查询协议，不扩展宿主后端。
执行：低风险 native，当前执行者单写入，external=0；以单个组件测试文件和差异检查验证。

```gherkin
Feature: 可读且受宿主能力约束的高级筛选
  Scenario: 所有操作符可翻译
    Given 中文或英文筛选器及任一受支持操作符
    When 显示条件
    Then 展示本地化名称并保留原始查询代码
  Scenario: 单一能力直接说明
    Given 宿主只支持全部条件及某字段的一种匹配方式
    When 显示筛选器
    Then 显示可读说明而非无效下拉框
  Scenario: 字段匹配方式准确
    Given 文本、状态、起始时间和结束时间分别限制为 contains、eq、gte、lt
    When 切换字段并应用
    Then 仅输出对应操作符和原始类型值
  Scenario: 自定义语言与运行时切换
    Given 宿主提供自定义翻译
    When 切换语言
    Then 标签随语言变化且草稿保留
  Scenario: 不支持的条件不提交
    Given 操作符不在字段或全局白名单中
    When 应用筛选
    Then 显示本地化错误且不调用 onApply
```

## 接入与翻译键

`fieldOperators={{ title: ['contains'], status: ['eq'], from: ['gte'], to: ['lt'] }}`
按字段限制操作符，与 `allowedOperators` 取交集；datetime/time 沿用时间比较操作符。
唯一匹配方式和唯一组合逻辑直接显示为说明文本，多选项仍使用选择器。

翻译优先调用当前 i18n scope/provider，缺失时回退到 UI 内置中英文，兼容现有 Core。
操作符使用 `filter.<CrudOperator>`（全部 28 项），逻辑使用 `filter.and` / `filter.or`；
字段、按钮、空态、错误使用 `filterBuilder.*` 和既有 `common.*` 键。
大小写敏感及数组包含全部的变体拥有独立含义与词条，切换语言不改查询代码和值。

## 验证

- `bun vitest run --config vitest.config.ts src/components/filter-builder.test.svelte.ts`（在 packages/ui）：68/68 通过，包含严格组件类型编译。
- 改动的四个源码/测试文件定向 ESLint、`bun run check:vibe-governance`、`git diff --check` 通过。
- 本地浏览器组件夹具使用 FA 实际安装的补丁包和 FA 参数适配器；中英文、1440×900 / 1920×1080 检查，提交后仍为扁平领域参数，未调用生产接口。
- 当前会话没有可调用的 `svadmin_getDiagnostics` 工具或已连接的运行时 collector；不将静态治理结果声明为真实应用运行时诊断。

截图：

- [中文 1440×900](filter-builder-i18n/filter-i18n-zh-1440.png)、[中文 1920×1080](filter-builder-i18n/filter-i18n-zh-1920.png)
- [英文 1440×900](filter-builder-i18n/filter-i18n-en-1440.png)、[英文 1920×1080](filter-builder-i18n/filter-i18n-en-1920.png)

夹具的业务字段名称由 FA 提供，保留中文；截图验证的是组件自身的语言切换。
