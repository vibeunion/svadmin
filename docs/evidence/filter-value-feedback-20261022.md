# 筛选值错误关联

## 续接约定

- parent: `enterprise-foundation-audit-20261021/README.md`
- source: 用户继续整体企业级规范。
- reason: 集合/范围值未接收无效状态及错误描述，集合外层标签指向不存在的控件。
- scope: FilterBuilder、FilterCollectionInput、直接测试及证据。
- non-goals: 不改查询编译、历史条件保留、授权、Provider 或发布流程。
- risk/orchestration: medium / managed；主线程唯一 writer，Ohm 只读 verifier。

## 契约与结果

1. 集合值有命名 group，四种实际输入（数字、文本、布尔、枚举）接收
   `aria-invalid` 和错误摘要 `aria-describedby`。
2. 单值可编辑控件也关联当前规则的错误摘要。
3. 错误摘要 ID 使用组件实例前缀，范围的两个端点关联同一规则错误。
4. 修正值后错误和描述引用移除，不串扰另一实例；不输出部分无效查询。
5. 集合标签沿用原有间距和语义颜色，没有新增颜色常量。

从 `packages/ui` 执行：

```sh
bunx vitest run --config ./vitest.config.ts src/components/filter-builder.test.svelte.ts
```

最终 48/48，含文件内局部严格类型检查；新增覆盖单值四分支错误关联，以及同一
实例多规则错误在修复/删除后的引用稳定性。`git diff --check` 通过。
运行有依赖 `svelte2tsx/index.js.map` 缺失警告，不影响退出 0。
Ohm 静态复核未发现阻断问题；指出的集合标签样式遗漏已补齐。

## 浏览器补充

新增真实源码消费者场景，覆盖嵌套数值规则切换范围、单值/范围/枚举错误描述、
错误索引变化后的关联保持、无效期间不输出部分查询，以及修复后的完整嵌套类型值。

```sh
bunx playwright test -c playwright.filter-feedback.config.ts --max-failures=1
```

结果：Chromium/WebKit/Firefox × desktop/narrow **6/6**，无 pageerror。
截图输出为 `test-results/browser-FilterBuilder-*/filter-feedback-recovered.png`。

## 边界

浏览器 DOM/可访问名称断言不等同屏幕阅读器软件认证；集合全部边界、真实查询
Provider、并发请求和发布验收仍未关闭。
