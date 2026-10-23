# StepsForm 取消确认键盘契约

## 任务约定

Parent：StepsForm 数组键盘流程；source：用户继续；
reason：未保存取消确认尚无完整局部键盘路径证据。
风险 medium / managed，主线程唯一 writer，一名只读 verifier。
范围限 StepsForm 弹层生命周期、现有浏览器测试与证据文档。
不修改公共 ConfirmDialog、依赖版本、权限或路由契约。

## 验收场景

1. Given 未保存数组草稿，When Enter 激活表单 Cancel，Then Portal 弹层获得焦点，正反 Tab 在 Cancel/Confirm 内循环。
2. Given 确认弹层，When Enter Cancel 或 Escape，Then 弹层关闭，草稿保留，焦点返回触发按钮，导航和写入均为零。
3. Given 再次打开弹层，When Tab 到 Confirm 并 Enter，Then 弹层关闭，路由调用一次且无数据写入。
4. Given fixture 路由未卸载表单，When 确认后再次打开并取消，Then 确认状态已重置，草稿保持，导航仍为一次。

## 问题与修复

重复 Chromium Escape 场景曾出现 `derived_inert`。
临时 console.warn 堆栈定位至 bits-ui AlertDialog.Content 的
`afterSleep(0, () => contentState.opts.ref.current?.focus())`。
原 `{#key confirmation}` 在关闭时立即销毁弹层，延迟回调随后读取已销毁 derived。

移除 StepsForm 中该 key，保持 ConfirmDialog 实例，仅通过 open 驱动关闭；
保留 scope/session 守卫和原确认回调，不修改公共组件。
独立只读复核未发现 P0/P1/P2 阻断。

测试同时修正第二次打开时抢在自动聚焦前按 Tab 的竞态：
两次打开均等待弹层自身获得焦点，不要求默认聚焦 Cancel，也不使用固定 sleep。
临时堆栈注入已移除，保留 derived_inert 和 pageerror 断言。
Portal 查询限定为 page 的 alertdialog，而非表单子树。

## 验证

从 packages/ui 执行：

```sh
bunx vitest run --config ./vitest.config.ts src/components/steps-contract.test.svelte.ts
```

88/88，通过，退出码 0，含局部严格类型检查。
既有 svelte2tsx source map 缺失提示仍存在。

从 scripts/fixtures/enterprise-ui 执行：

```sh
bunx playwright test --config=./playwright.steps-form.config.ts --grep 'cancel confirmation' --workers=1 --repeat-each=2
```

最终版本 Chromium/WebKit/Firefox × 桌面/窄屏 × Cancel/Escape，
12 个组合各运行两次，24/24，通过，退出码 0。
无 pageerror 或 derived_inert；macOS WebKit 使用现有 Alt+Tab 路径。
未重新运行此前完整 StepsForm 浏览器矩阵，不将重复运行计为新增场景。

## 边界

fixture 的 router.go 仅计数，不执行真实页面导航。
本轮不覆盖真实路由卸载、浏览器离页提示、快速打开立即关闭的专项压力测试、
真实读屏、多行删除重排、发布包或线上部署，不代表企业级规范整体完成。
