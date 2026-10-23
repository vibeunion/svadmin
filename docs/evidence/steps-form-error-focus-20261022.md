# StepsForm 首错聚焦与错误关联

## 续接约定

- Parent：`steps-form-array-contract-20261022.md`。
- Source：用户继续直到整体目标完成。
- Reason：数组组不提供 `aria-invalid`，旧首错选择器无法聚焦；错误 ID 仅由资源与字段生成，多实例碰撞。
- Medium / managed：主线程唯一 writer，一名只读 verifier。
- 范围：StepsForm、直接消费者单文件测试、既有浏览器 fixture 与文档。不改 Core、公开 API、发布或部署。

## 验收场景

1. Given 复合字段与标量字段同时无效，When 点击下一步，Then 按当前步骤显示顺序聚焦首个可操作控件。
2. Given 数组子字段与顶层错误字段同名，When 校验失败，Then 不把顶层错误映射到有效的子字段。
3. Given 同资源两个 StepsForm，When 分别以 Enter 触发校验，Then 错误 ID 不重复、描述引用和焦点只落在提交实例。
4. Given 确认步骤保存时服务端拒绝数组字段，When 返回错误步骤并修正，Then 聚焦数组新增操作、保留错误关联且允许显式重新提交。

## 实现与回归

- 错误 ID 使用 `$props.id()` 实例前缀。
- 只遍历表单直接子级 FieldRenderer，避免嵌套同名字段误匹配。
- 在字段内依 DOM 顺序尝试聚焦，跳过 disabled、hidden、inert、aria-disabled 控件及不可操作祖先。
- 保留当前 scope/session 和挂载检查；不改变步骤切换的重挂载行为。

组件单文件新增 14 项，包括八种复合字段、显示顺序、嵌套同名、aria-disabled 祖先、
双实例和服务端数组错误。原精确固定 ID 断言改为验证真实描述引用存在于自身表单。

测试中首先纠正了无约束 schema、可选空字符串跳过校验、挂载后替换已捕获 provider 方法
等夹具问题。有效夹具随后复现初版遍历嵌套同名子字段的错误聚焦；限制顶层容器后通过。

## 验证

从 `packages/ui` 执行：

```sh
bunx vitest run --config ./vitest.config.ts src/components/steps-contract.test.svelte.ts
```

84/84 通过，含局部严格 TypeScript 检查，退出码 0。环境存在既有 svelte2tsx source map 缺失警告。

从 `scripts/fixtures/enterprise-ui` 执行：

```sh
bunx playwright test --config=./playwright.steps-form.config.ts
```

Chromium / WebKit / Firefox × 1440×1000 / 390×844，60/60 通过，退出码 0：
保留此前八种场景的 48 项，新增双实例错误引用/Enter 聚焦/独立提交与服务端拒绝后修正共 12 项。
所有场景检查 pageerror；成功提交等待导航完成，不以 provider 写入计数冒充回执被接受。

## 保留边界

程序化聚焦和 Enter 激活不是完整 Tab 顺序验收，也不等于真实读屏认证。
八种复合控件的全部键盘流程、国际化切换、打包发布、真实 Provider 和线上部署仍未由本轮关闭。
本专项完成不代表企业级规范整体完成。

## 独立复核续修：禁用 Fieldset

复核发现非原生 `[tabindex]` 控件不能仅依赖 `:disabled` 判断 fieldset 祖先禁用。
本次按同一任务边界修复该 P2：逐层检查所有 disabled fieldset，只在候选控件位于
对应 fieldset 的第一个直接子 legend 中时豁免；内层例外不能绕过外层禁用。

新增四个组件用例，保持顶层 FieldRenderer 容器为 form 直接子级，将真实 Transfer
控件置于字段内部的 fieldset 中，分别覆盖普通内容、第一 legend、第二 legend、
内层第一 legend 但外层仍禁用。初始误将整个字段移出顶层扫描范围的夹具已替换，
其通过结果不作为证据。

有效夹具在修复前为 3 失败 / 1 通过；修复后四项均通过。
上述 StepsForm 单文件重跑为 **88/88，退出码 0**，含局部严格类型检查。
独立 verifier 已确认原 P2 关闭，未发现新增 P0/P1/P2。
修复后上述专属 Playwright 配置复跑 **60/60，退出码 0**，原有十场景跨引擎行为无回归。

这些新增场景尚未加入真实浏览器 fixture，不以既有浏览器矩阵替代 fieldset 专项验收。

## 数组流程键盘顺序

续接约定：parent 为本专项，source 为用户继续，reason 为缺少键盘顺序证据。
本轮只改浏览器用例和文档，主线程唯一 writer，复用一名只读 verifier。

新增一个真实源码场景验证：Enter 新增单行后，正反向遍历 Add、Remove、
Item name、Cancel、Next；禁用 Move Up/Move Down 不进入该路径。
Review 内验证 Back/Save 双向顺序、Enter 返回保留值、Enter 保存及精确载荷，
成功等待导航完成。步骤切换后手动设置局部路径起点，不声称验证了整个页面的连续焦点恢复。

从 `scripts/fixtures/enterprise-ui` 执行：

```sh
bunx playwright test --config=./playwright.steps-form.config.ts --grep 'tab order'
```

Chromium / WebKit / Firefox × 桌面 / 窄屏 **6/6**，退出码 0。
macOS WebKit 沿用既有 Alt+Tab / Alt+Shift+Tab，其余使用 Tab / Shift+Tab；
未修改系统设置或生产 tabindex。此轮不重新声明此前 60 项全部执行。

初次 Review 文本断言匹配两个节点，后续改为唯一控件断言。移动按钮名称大小写
不一致也已修正；曾将该失败误判为 Enter 未新增，快照确认行已存在后恢复 Enter 路径。
这些均为测试问题，未据此修改生产组件。

仍不覆盖多行重排/删除后的焦点恢复、取消确认弹窗、页面外部入口或真实读屏。

取消确认弹窗已在 `steps-form-cancel-confirmation-20261022.md` 续接，
包含生命周期修复和 Cancel/Escape 键盘专项；其他上述边界保持未完成。
