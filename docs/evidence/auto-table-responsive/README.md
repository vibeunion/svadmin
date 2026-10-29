# AutoTable 响应式可见性证据

本次修复验证了 UI 与 AI 样式同时加载时，AutoTable 的桌面表格和移动卡片不会被通用 `.hidden` 规则互相覆盖。

源码修复提交为 `4d07316a`。截图由同一生产构建生成，未覆盖生产 CSS；截图前将真实表格滚动到视口内。证据覆盖本地受控示例，不代表 npm 发布或线上部署验收。

验证命令：`bun run playwright test --config playwright.rendering.config.ts`，业务渲染文件共 59 项通过。两张截图使用同文件的 `migration evidence` 用例生成。

## 状态矩阵

| 视口 | 记录视图 | 结果 |
| --- | --- | --- |
| 767px | 移动卡片可见，桌面表格隐藏 | 通过 |
| 768px | 桌面表格可见，移动卡片隐藏 | 通过 |
| 1280px | 桌面表格可见，移动卡片隐藏 | 通过 |

业务渲染浏览器测试在 1440x900、1920x1080 下均通过，并保存了当前修复后的真实页面截图。

![AutoTable 1440x900](./typed-rendering-1440x900.png)

![AutoTable 1920x1080](./typed-rendering-1920x1080.png)
