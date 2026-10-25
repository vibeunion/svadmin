# ApprovalCenter 跨浏览器证据

- parent: `approval-center-browser-20261022.md`
- command:
  `bunx playwright test --config=./playwright.approval-center.cross-browser.config.ts`
- scope: ApprovalCenter 读取失败重试与审批失败恢复 fixture
- source: 用户持续目标；reason: 补齐既有审批工作流跨引擎证据。
- risk/orchestration: medium / managed，主线程 writer，Bohr 只读复核无阻断。

## 结果

- WebKit desktop/narrow 与 Firefox desktop/narrow 均通过：**4/4**。
- Playwright 1.62.1，WebKit 26.5（2336）、Firefox 153.0（1538）；
  自动生成对应项目截图，本轮未逐张检查，不等于视觉或读屏认证。
- 首次启动缺少当前 runner 匹配的 WebKit 2336 和 Firefox 1538；
  本机原有 WebKit 2368 属于另一 runner，Firefox 尚未安装。通过
  `bunx playwright install webkit firefox` 安装匹配版本后重新执行成功。
  首次四项启动失败不算行为验收，未修改项目依赖或锁文件。
- 该矩阵只验证 ApprovalCenter 当前本地 fixture，不代表其他 UI 组件、
  读屏软件、真实 Provider 或生产浏览器认证。
