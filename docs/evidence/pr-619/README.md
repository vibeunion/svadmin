# PR 619 浏览器证据

渲染提交：`15f74209ea40c3430a91bad34bf46e8745fff126`。使用该提交构建的 `packages/ui/dist/app.css`，在真实 Chromium 中验证 CSS 布局夹具；不包含完整业务应用验收。

| 状态矩阵 | 已验证行为 |
| --- | --- |
| 390 / 767px，LTR / RTL，4 个新旧展开/折叠类名 | 左右 margin 为 0，transition-property 为 none，无横向溢出 |
| 768 / 1440 / 1920px，LTR / RTL | 原有桌面 transition 保留 |
| 桌面原生展开 / 折叠 | 内容宽度减去 252 / 70px，RTL 镜像偏移，无横向溢出 |

40 组计算样式与布局断言全部通过，结果和 CSS SHA-256 见 `browser-results.json`。

截图：`sidebar-1440x900.png`、`sidebar-1920x1080.png`，均为当前 CSS 的真实视口截图。

复现：构建 UI 包，将 `fixture.html` 复制至 `output/playwright/pr-619/index.html`，在仓库根目录启动 `python3 -m http.server 4239 --bind 127.0.0.1`，用 Playwright CLI 打开 `/output/playwright/pr-619/index.html`，并通过 `run-code --filename docs/evidence/pr-619/verify-browser.txt` 执行计算样式断言。

定向检查：app-css 与颜色契约 19 项，发布 CSS 契约 55 项，UI 包构建、定向 ESLint、`git diff --check` 均通过。
