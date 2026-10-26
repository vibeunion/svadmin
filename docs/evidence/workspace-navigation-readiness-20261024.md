# Workspace 导航就绪边界与 Firefox load 等待（2026-10-24）

## 任务契约

- parent: `docs/evidence/workspace-lifecycle-cross-browser-20261024.md`
- 目标：定位上一轮跨浏览器矩阵中 Firefox 偶发 `page.reload()` 等待 `load`
  超时的本地测试依赖，区分“非业务外部字体资源阻塞 load”与“SPA 业务未就绪”。
- orchestration: managed medium；唯一 writer 为 pi，主线程独立验收。
- 写入范围：`e2e/workspace-tabs.spec.ts`、确有需要时的
  `playwright.workspace-tabs.cross-browser.config.ts`、本文档。
- 非目标：全量 78 例矩阵、全仓检查、提交/推送/部署、真实后端或 Provider、
  新增移动场景、加 retry/提高 timeout/skip/降低现有业务断言。
- 环境：本地 example；预览 `127.0.0.1:5187` 保持运行不杀；专属测试仍用
  `127.0.0.1:5186` fresh 单 worker。

## 观察事实

- `example/index.html` 在 `<head>` 同步引用
  `https://fonts.bunny.net/css?...`。样式表属于 render/load 阻塞资源，浏览器
  `load` 事件要等它完成；Vite 开发 WebSocket 不参与 `load` 事件完成条件。
- 上一轮唯一未拼绿失败是 Firefox 中
  `closing and eviction clear only their tab while reload restores allowed state`
  的 `page.reload()` 默认等待 `load` 超过 60s；该例隔离 1/1 通过。另一轮曾见
  Firefox 登录等待超时。两者都发生在导航就绪等待，而非业务状态断言。
- 既有 spec 中所有 `page.reload()` 都使用默认 `load`，登录和打开工作区使用
  `page.goto()` 默认 `load`；业务就绪另由 heading、tab、pane、输入值、hash
  等真实断言确认。
- 不能把开发 WebSocket 当根因；也不得用 `goto` 冒充 SPA。

## 验收 Gherkin

```gherkin
Feature: Workspace navigation readiness is decoupled from non-business assets

  Scenario: Controlled delay of the external font stylesheet blocks load but not business readiness
    Given 浏览器对 fonts.bunny.net 的样式表施加受控延迟
    When 打开登录页并完成真实登录
    And 进入 /workspace
    And 触发页面 reload 且等待 load
    Then load 在受控延迟窗口内保持未完成
    But 工作区 heading、tab、pane 与业务状态仍可在同一文档内就绪
    And 现有业务断言不依赖该外部字体资源

  Scenario: Reload keeps all business readiness assertions after waiting for DOM readiness
    Given 已保存允许恢复的工作区标签状态
    When 以 DOM 就绪而非 load 完成等待 reload
    Then 页面仍通过原有 heading、tab、hash 与输入值断言
    And 不新增 retry、不提高 timeout、不 skip、不降低状态断言

  Scenario: Local module loading is not routed through the system PAC proxy
    Given 本机系统 PAC 对 127.0.0.1 也返回代理
    When 测试浏览器加载本地 example 与 Vite 模块
    Then localhost 直连，不经过可能返回 502 的系统代理
    And 非本地请求快速失败，唯一外部字体样式表已由测试显式隔离
```

## 边界与判定

- 只有受控延迟证据同时满足以下条件，才允许把导航等待从 `load` 调整为
  `domcontentloaded`：
  1. 字体请求确实延迟了 `load`；
  2. 在 `load` 未完成时，业务 heading/状态已经就绪；
  3. 调整后所有既有真实业务就绪与状态断言保留并通过。
- 若不能证明，则不改变等待行为，并在本文档记录剩余根因。
- 定向验证上限：当前 spec 中直接相关 2–3 例的 Firefox 重复运行，加对应
  跨 engine 小集合；不运行 78 全矩阵。失败 trace 保留到
  `output/playwright/workspace-navigation-readiness-20261024/` 独立目录。

## 受控实验与红绿证据

### 1. 字体样式表阻塞导航就绪（已证）

- Firefox 对 `fonts.bunny.net/css?...` 施加 10s 受控延迟时：
  `page.goto(..., { waitUntil: 'domcontentloaded' })` 与
  `waitUntil: 'load'` 都在 4s 内超时，`document.readyState` 仍为
  `interactive`。说明该 head 同步样式表同时阻塞 DOMContentLoaded 与 load，
  单纯把等待改成 `domcontentloaded` 不能解决。
- 同一请求改为 abort 或 fulfill 空样式表时，Firefox `load` 分别约 458ms /
  451ms 完成，`readyState=complete`。
- 真实登录并进入 `/workspace` 后，把同一字体请求受控延迟到 60s 以上：
  - `page.reload()` 默认等待 `load` 在 60041ms 抛 `TimeoutError`；
  - 当时 `readyState=interactive`，workspace heading 不可见；
  - 失败截图阶段 Playwright 自身报 `waiting for fonts to load...`；
  - 同一导航改为隔离字体样式表后，`reload(waitUntil: 'load')` 约 1320ms
    完成，`readyState=complete`，hash 仍为 `#/workspace?tab=crm_deals`。
- 失败 trace 与截图：
  `output/playwright/workspace-navigation-readiness-20261024/reload-load-timeout-firefox-trace.zip`、
  `reload-load-timeout-firefox.png`、`repro-reload-load.log`、
  `font-load-diagnostic.log`。

### 2. 系统 PAC 代理风险与中间误判

- 定向重复验证中曾出现另一个失败：reload 已越过 load，workspace heading 未出现。
  失败 trace
  `output/playwright/workspace-navigation-readiness-20261024/test-results/workspace-tabs-closing-a-d-4a9cb-eeps-it-absent-after-reload-firefox-desktop-repeat1/trace.zip`
  中 `reactive-value-9zY1aBhx.js` 一次 200、一次 502 `Bad Gateway`，页面报
  `error loading dynamically imported module`。本机 `scutil --proxy` 的 PAC
  对 localhost 也返回代理，这是仍需隔离的本地测试依赖，不是 workspace 业务缺陷。
- 主线程解析该 trace 得到 2055 条本地请求，其中 1966 条记录端口 7897；
  不能把未提供地址的请求也算入其中。中间实验曾因页面访问成功，就把端口仍为
  7897 的请求称为“直连”，这是错误推断，现已撤回。成功访问不能区分系统
  代理转发与直连，必须核对实际连接地址。
- 旧 bypass 矩阵（同目录 `proxy-bypass-matrix.log`、
  `proxy-direct-loopback-trace.zip`）只记录页面是否成功，未记录
  `response.serverAddr`；它不能证明网络实际直连。Chromium 的 `<-loopback>`
  是减集 token 的解释仍成立，但“显式列出 loopback 主机即跨引擎直连”的旧结论
  已被下节 `response.serverAddr` 实验推翻。
- 本节保留为问题发现与错误归因记录；最终代理关闭方式以第 3 节为准。

### 3. 系统代理必须在 browser launch 层按引擎关闭（修正 test.use proxy）

- 主线程最小实测：Firefox 在 context `proxy: { server: 'http://127.0.0.1:9',
  bypass: '127.0.0.1,localhost' }` 下访问 `http://127.0.0.1:5187/`，
  `response.serverAddr` 仍是 `127.0.0.1:7897`；同一 context 再加
  `firefoxUserPrefs: { 'network.proxy.type': 0 }` 后才是
  `127.0.0.1:5187`。因此 spec 里的 `test.use({ proxy })` 不能冒充直连。
- 本轮独立最小直连实验脚本与日志：
  `output/playwright/workspace-navigation-readiness-20261024/verify-20261024/proxy-serveraddr-probe.mjs`、
  同目录 `proxy-serveraddr-engines.log`（5187）与
  `config-proxy/serveraddr-engines-5186.log`（临时启动的专属测试端口 5186）。
  文档请求的 `response.serverAddr` 实测：

| engine / launch variant | 5187 serverAddr | 5186 serverAddr |
| --- | --- | --- |
| Chromium baseline | `127.0.0.1:5187` | `127.0.0.1:5186` |
| Chromium `--no-proxy-server` | `127.0.0.1:5187` | `127.0.0.1:5186` |
| Firefox baseline | `127.0.0.1:7897` | `127.0.0.1:7897` |
| Firefox `network.proxy.type=0` | `127.0.0.1:5187` | `127.0.0.1:5186` |
| WebKit baseline | `127.0.0.1:5187` | `127.0.0.1:5186` |
| WebKit `--proxy-bypass-list=127.0.0.1,localhost` | `127.0.0.1:5187` | `127.0.0.1:5186` |
| WebKit `--proxy=direct://` | 启动崩溃，未采用 | 启动崩溃，未采用 |

- 判定与修正（只改测试边界）：
  1. 删除 `e2e/workspace-tabs.spec.ts` 的 `test.use({ proxy })`，保留
     `isolateNonBusinessFontStylesheet` 字体 route。
  2. `playwright.workspace-tabs.cross-browser.config.ts` 按 `browserName` 生成
     `launchOptions`：Chromium 用 `args: ['--no-proxy-server']`；Firefox 用
     `firefoxUserPrefs: { 'network.proxy.type': 0 }`；WebKit 不猜参数。
  3. WebKit 边界：本地 Playwright 1.62.1 WebKit 仅暴露 `--proxy` /
     `--proxy-bypass-list`，没有可靠的“关闭系统代理”启动选项；
     `--proxy=direct://` 会触发 `NSInvalidArgumentException` 启动崩溃。实测其
     默认 loopback 已直连，故保持默认，并记录“WebKit 未显式关闭系统代理，只
     验证了 loopback 默认直连”这一边界。
- 修正后定向验证（配置：
  `playwright.workspace-tabs.cross-browser.config.ts`；同组 3 例）：
  - 跨引擎各 1 次：**9/9** 通过，50.9s，exit 0，无 skip；日志
    `output/playwright/workspace-navigation-readiness-20261024/verify-20261024/config-proxy/cross-engine.log`。
  - Firefox repeat 2：**6/6** 通过，38.7s，exit 0，无 skip；日志
    `output/playwright/workspace-navigation-readiness-20261024/verify-20261024/config-proxy/firefox-repeat2.log`。
  - 失败/成功计数：失败 0、成功 15、skip 0；实际测试连接地址为专属
    `127.0.0.1:5186`，三种引擎在该端口的 `response.serverAddr` 均测得
    `127.0.0.1:5186`。
- 旧 `test.use proxy` 轮次的 6/6、9/9 日志仍保留，但不再作为“已验证直连”的
  证据。

## 最终状态

- 已证的依赖风险：同步字体样式表在受控延迟下可复现 60s `TimeoutError`，
  隔离后同一 reload 约 1.3s 完成。该实验同时阻塞 DOMContentLoaded，
  所以不能仅更换导航等待事件。实验不证明此前每次偶发超时都由字体导致；
  原始超时的唯一根因仍未确定。
- 追加判定：系统 PAC 对 localhost 返回代理的本地风险成立，且 Firefox 只有在
  browser launch 层设置 `network.proxy.type=0` 才真正直连；context `proxy` +
  loopback bypass 仍会连接 `127.0.0.1:7897`。原失败 trace 的
  `_serverPort: 7897` 仍不能单独作为代理证据，但本轮 `response.serverAddr`
  已给出确定判定。该次 heading 未出现的剩余根因未在定向重复中复现，保持未知，
  不能归因于 workspace 业务，也不能归因于已证实的字体阻塞。
- 最小修正（仅测试边界，不改 example/业务实现）：
  1. `isolateNonBusinessFontStylesheet` 在浏览器内以空 CSS 显式隔离
     `fonts.bunny.net`；
  2. 删除 `test.use({ proxy })`；
     `playwright.workspace-tabs.cross-browser.config.ts` 按引擎配置
     `launchOptions`：Chromium `--no-proxy-server`，Firefox
     `firefoxUserPrefs.network.proxy.type=0`；WebKit 无可靠关闭选项，保持默认
     并记录 loopback 默认直连边界。
  未新增 retry、未提高 timeout、未 skip、未降低或替换任何既有业务状态断言；
  所有 `page.reload()` 仍按默认 `load` 等待，业务就绪仍由 heading/tab/hash/
  输入值等真实断言确认。
- 主线程独立验收：最终 browser-launch 配置下，同组 3 例三引擎
  **9/9**，exit 0，50.9s；目标 ESLint 与 `git diff --check` 通过。
  输出目录 `output/playwright/workspace-navigation-readiness-20261024/main-final-config/`。
  首次命令因诊断服务占用 5186 未执行测试；确认并清理本任务遗留服务后重新
  启动 fresh webServer。未改 `reuseExistingServer`，未停止 5187 预览。
- 保留主线程中间失败：旧 context-proxy 配置下，18 条定向重复中 **17/18**
  通过，Firefox 一例 `reload` 等待超时，证据在同根目录 `main-verification/`。
  旧配置后续 **9/9**（52.5s）不能消除该失败；最终 9/9 是移除旧 proxy、
  显式配置 browser launch 后的新结果。三次运行不合并计数，不称长期稳定性
  或完整 78 条矩阵已经通过。WebKit 仅验证本机默认 loopback 直连。
- 本轮最终修正后定向 Firefox（同组 3 例 × 2 次）：**6/6** 通过，38.7s，
  exit 0，无 skip。日志：
  `output/playwright/workspace-navigation-readiness-20261024/verify-20261024/config-proxy/firefox-repeat2.log`。
- 本轮对应跨 engine 小集合（同 3 例 × Chromium/WebKit/Firefox 各 1 次）：
  **9/9** 通过，50.9s，exit 0，无 skip。日志：
  `output/playwright/workspace-navigation-readiness-20261024/verify-20261024/config-proxy/cross-engine.log`。
- 原失败 trace（字体超时与 502）分别保存在
  `output/playwright/workspace-navigation-readiness-20261024/reload-load-timeout-firefox-trace.zip`
  与同目录 `test-results/` 下，未被后续成功运行覆盖。
- 定向 ESLint `--max-warnings 0` exit 0；spec/config 局部
  `tsc --noEmit --ignoreConfig --strict` exit 0；`git diff --check` exit 0。
- 未运行 78 全矩阵、未运行 example/全仓检查、未提交/推送/部署，预览 5187
  未停止。剩余未覆盖：真实后端/Provider、真实读屏器、跨窗口同步、其它
  Playwright 配置或全仓测试套件是否也受系统 PAC 影响。
