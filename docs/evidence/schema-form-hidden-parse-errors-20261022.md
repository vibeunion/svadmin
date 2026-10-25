# 条件表单隐藏解析错误

## 续接约定

- parent/source：`../evaluations/enterprise-ui-plan.md` 批次二 Schema 表单，
  用户继续完成原范围。
- 目标：条件隐藏字段不参与当前提交校验；重新显示时未修正解析错误仍阻断提交。
- 写入范围：JsonSchemaForm、企业表单单文件测试、本证据与计划。
- 非目标：修改 core/Lite 协议、增加 Schema 关键字、更改可见性规则或发布。
- 风险/协作：medium / managed，主线程唯一 writer，Bohr 只读 verifier。

## 验收场景

1. Given 数字字段有 badInput 解析错误，When 提交可见字段，
   Then 不调用 onsubmit，字段标记无效。
2. Given 字段自身、祖先对象或祖先数组被 visibleWhen 隐藏，
   When 提交，Then 不因隐藏解析错误阻断，载荷省略隐藏字段。
3. Given 隐藏字段重新显示，When 未修正就提交，
   Then 仍不调用 onsubmit，聚焦错误控件；修正后提交新的数值。

## 实现与证据

- 提交阶段按 Schema 路径逐级检查条件可见性，只过滤本次参与校验的解析错误，
  不从 parseIssues 删除原错误。不认识的路径保守保留错误。
- 与渲染保持一致，仅在 coreSchema 接受条件 Schema 时应用可见性；
  条件始终从 prepared 根值解析，不使用投影后数据。
- 三个新增用例包含带 `/` 与 `~` 的字段名 `amount/~net`，覆盖 JSON Pointer
  解码、自身/祖先隐藏、完整提交载荷、重新显示和修正。
- 原组件复现：41 通过、3 失败，隐藏后 onsubmit 实际调用 0 次。
- 修复后：44/44；暂时移除过滤再次 41 通过、3 失败；恢复最终实现后 44/44。
- 命令：在 `packages/ui` 执行
  `bunx vitest run src/components/json-schema-form-enterprise.test.svelte.ts`。
  包含测试内局部严格类型检查，退出 0；`git diff --check` 通过。
- 存在既有 svelte2tsx source map 缺失警告，没有修改依赖。
- Bohr 独立只读复核：未发现 P0/P1/P2 阻断，确认 Pointer 解码、根值可见性、
  parseIssues 保留及三例真实控制字段切换；未覆盖“数组可见但仅行内字段隐藏”。

## 审计纠正与边界

此前关于 core 根值被子对象覆盖的判断已撤回：原 value 是闭包根参数，
递归参数为 current。相关 core 改动及实验测试均撤回，core/schema-form.ts
无本轮差异。第一次新增用例因必填标签带星号定位失败，修正后才获得上述行为红灯。

此前 API 与 Profile/MFA 的 WebKit/Firefox 各 8/8 是已记录 64/64 矩阵的复验，
不算新增覆盖，更不证明本次 Schema 变更。上述组件测试使用 DOM 模拟器注入
数字 badInput；真实浏览器证据见下节，读屏、分发包和消费者构建仍未验收。

## 真实浏览器续接（2026-10-22）

- parent/source：上述条件错误回归及用户持续目标；reason：补齐真实 badInput 交互，
  不以文本 required 错误代替解析错误验收。
- 范围：已有 enterprise-ui App、browser.spec.ts、新专项配置及证据/计划。
  medium / managed，主线程唯一 writer，Bohr 只读 verifier；不改生产组件。
- 新增 `?view=schema-conditional&condition=`：
  `field`（字段隐藏）、`object`（父对象隐藏）、`array`（父数组隐藏）、
  `row-field`（数组可见、仅行内字段隐藏）。Schema 在挂载后不替换。
- 使用真实键盘顺序输入 `1e`，逐项断言浏览器 `validity.badInput === true`；
  未注入 validity、跳过场景或直接调用组件内部函数。
- 在 `scripts/fixtures/enterprise-ui` 执行
  `bunx playwright test --config=./playwright.schema-form.config.ts`：
  Chromium/WebKit/Firefox × 1440x1000/390x844 × 4 路径，**24/24**，退出 0。
- 首次错误提交计数为 0；隐藏后精确省略隐藏载荷且计数为 1；恢复后错误及焦点
  回到输入，计数仍为 1、结果保持隐藏态载荷；修正为 12 后计数为 2 且完整载荷
  正确，所有场景无 pageerror。
- 24 张截图位于 `output/playwright/schema-conditional/`。人工检查
  `chromium-narrow-row-field-restored-error.png`、
  `firefox-desktop-object-restored-error.png`：输入、错误、按钮无明显遮挡；
  其余截图未逐张检查，不外推整体视觉认证。
- 初版文本必填测试因实际标签 `Name*` 与精确定位不符而超时两项；该测试既不是
  解析错误覆盖，也不是产品行为红灯，已替换为上述数字键盘场景。
- Bohr 只读复核确认四路径不重挂载、不替换 Schema、原生 badInput 与计数/载荷
  断言有效，专项配置确为 24 项；未发现 P0/P1 阻断。提出的 P2 文档历史边界
  歧义已改为显式区分组件测试与本节浏览器证据。

本节更新前文浏览器待验收边界，也补上可见数组内条件字段路径。
使用源码组件、已有构建 CSS 与本地 onsubmit 回调，未验证新分发包、真实后端、
读屏、生产浏览器版本或部署；不声明完整 Schema 表单或整体企业级规范完成。
