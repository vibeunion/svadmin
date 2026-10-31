# PR 620 浏览器证据

渲染提交：`d34e4d0c`。真实 Chromium 渲染实际 `DataTableShell` 与 `AppearanceSettings` 源组件、发布 CSS，以及两个独立 i18n scope；不包含真实后端验收。

| 状态矩阵 | 已验证行为 |
| --- | --- |
| en / zh-CN 计数 | 分别显示 Total: 128 / 共 128 条 |
| 内置 Violet 预设 | 无障碍名称分别为 Violet / 紫罗兰色 |
| 宿主覆盖 neutral 名称 | Tenant neutral 在两个语言域和切换语言后均保留 |
| 单侧切换语言 | 对应计数与预设名称更新，另一个组件树不受影响 |
| 1440x900 / 1920x1080 / 390x844 | 无横向溢出 |
| 缺失宿主翻译 | 定向单元测试确认原始颜色标签与计数回退 |

24 项定向组件测试通过，UI 包构建、定向 ESLint、`git diff --check` 通过。浏览器 DOM 验证结果及源文件 SHA-256 见 `browser-results.json`。

`localized-1440x900.png` 与 `localized-1920x1080.png` 是相同源代码渲染的真实双语言视口截图。`verify-browser.js` 为 Playwright CLI 使用的 DOM 验证函数。
