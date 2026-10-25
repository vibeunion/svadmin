# Schema 表单说明与错误关联

## 续接约定

- parent/source：`../evaluations/enterprise-ui-plan.md` Schema 表单及用户“继续”。
- 目标：为控件与对象/数组组关联帮助文本及错误，保证错误清除后说明仍可访问。
- 范围：JsonSchemaForm、其企业专项测试、本证据与计划；不改 Core/Lite 或发布协议。
- 风险/协作：medium / managed；主线程唯一 writer，Bohr 只读复核。

## 实现与验收

- 帮助文本和错误通过 `aria-describedby` 同时关联；无对应内容时不生成引用。
- object/array 使用 fieldset 的组级关联，null 控件补齐错误关联及 aria-invalid。
- 辅助节点采用 `:description` / `:error` 后缀，字段路径经 encodeURIComponent
  编码冒号，避免 `text-description` 等合法字段名与辅助 ID 碰撞。
- Given 数字解析错误，When 输入修正并提交，Then 错误节点与引用移除，
  帮助文本引用保留。
- Given 两个表单及各类控件/分组，Then 描述引用位于所属表单且 ID 唯一。
- Given null、对象或数组自身校验失败，Then 同时关联描述和错误且不提交。
- 在 `packages/ui` 执行
  `bunx vitest run src/components/json-schema-form-enterprise.test.svelte.ts`：
  **49/49 通过，退出 0**，含既有局部严格类型检查。
- 既有 svelte2tsx source map 缺失警告不影响通过，未修改依赖。
- 初版新增测试漏传 onsubmit，未进入组件提交校验；修正夹具后通过。
  先前将该失败归因于原生 minlength 的判断已纠正。
- Bohr 首次复核发现 ID 碰撞及 null 错误关联缺口，已修复并增加回归。
- 修复后 Bohr 只读复核未发现 P0/P1/P2 阻断；`git diff --check` 通过。

## 真实浏览器验收（2026-10-22）

- 在 `scripts/fixtures/enterprise-ui` 执行
  `bunx playwright test --config=./playwright.schema-form.config.ts`。
- Chromium/WebKit/Firefox × 1440x1000/390x844 × field/object/array/row-field，
  **24/24 通过，退出 0**。
- 使用真实表单 DOM 验证：字段和组能读取帮助文本；错误出现时同时关联帮助和
  错误；隐藏条件切换后没有悬空 `aria-describedby`；恢复后错误描述和焦点仍在；
  修正后错误引用移除而帮助文本保留；每个表单实例内 ID 唯一。
- 本次失败的首轮仅为数组项 fieldset 的可访问名称定位假设（外层为 `details`、
  行组为 `details 1`），调整测试定位后 24/24 通过，未发现组件行为回归。
- 截图沿用 `output/playwright/schema-conditional/`，只作为布局辅助证据；
  未进行逐张视觉审核。
- Bohr 复核确认四路径的描述、隐藏引用、恢复与提交断言有效；提醒 ID 检查只限
  当前表单，本文不声明整页所有组件 ID 唯一。复核未自行运行浏览器；
  上述 24/24 为主线程最终命令结果。

## 边界

本轮未执行真实读屏软件、新分发包构建或发布/部署验收。
浏览器 DOM 可访问性断言不等于读屏软件认证，不据此关闭完整 Schema
表单或整体企业级路线图。
