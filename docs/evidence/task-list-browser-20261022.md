# 任务列表浏览器验收

## 续接约定

- parent: `task-list-selection-20261022.md`
- source: 用户要求继续完善和验收企业级规范。
- reason: 组件级事件测试不能证明真实 Chromium 下的 Tab/Enter/Space 和表单边界。
- goal: 在既有 enterprise-ui fixture 中验证任务详情键盘入口、行内动作隔离和
  `type=button` 表单语义。
- scope: `scripts/fixtures/enterprise-ui/App.svelte`、专项浏览器配置与测试、本文及路线图。
- non-goals: 不把 fixture 当真实任务服务、读屏或跨浏览器验收。
- risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读 verifier。

## 验证状态

- `bunx playwright test --config=./playwright.task-list.config.ts`：
  **8/8 通过**，桌面 1440x1000 与窄屏 390x844 各覆盖四项场景。
- 真实 Chromium 已验证 Tab/Enter/Space 进入详情、Cancel 不触发行选择、
  详情和动作不提交表单，以及窄屏表格可横向滚动。
- 截图：`output/playwright/task-list/desktop.png`、
  `output/playwright/task-list/narrow.png`，以及相同目录的
  `desktop-scrolled.png`、`narrow-scrolled.png`。
- 窄屏初始截图仅显示左侧列；进一步检查确认上游 Table 已提供内部横向滚动，
  实测滚动到末端后 Details 完整进入容器可视范围且可以激活。未新增重复滚动样式。
- 首次运行因开发/预览端口不一致而超时，未执行用例；专项配置现固定 4189、
  strictPort，并只运行当前文件的四项任务列表场景。原有表单/筛选/电子表格
  浏览器用例本轮未运行，不宣称通过。
- 这是本地 fixture 和静态任务 Provider；真实 Provider、读屏、跨浏览器和发布
  验收未完成。
- Bohr 独立只读复核未发现 P0/P1/P2 阻断或伪通过，`git diff --check` 通过。
  横向滚动采用脚本设置 scrollLeft，不证明触摸手势或页面整体无溢出；任务固定
  processing，只覆盖 Cancel，不覆盖 Retry 或取消后的状态迁移。夹具组合源码组件
  与包导出的构建 CSS，不是发布包验收。
