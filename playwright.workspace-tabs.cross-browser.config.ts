import { defineConfig } from '@playwright/test';
import workspaceTabsConfig from './playwright.workspace-tabs.config';

type DesktopBrowserName = 'chromium' | 'webkit' | 'firefox';

/**
 * 只关闭测试浏览器的系统代理，不改任何业务代码或请求。
 * - Chromium：`--no-proxy-server` 显式禁用系统代理。
 * - Firefox：`network.proxy.type=0` 才真正绕过系统 PAC；仅给 context 配
 *   proxy/bypass 时 Firefox 仍可能把 loopback 交给系统代理（实测
 *   response.serverAddr 仍为 127.0.0.1:7897）。
 * - WebKit：Playwright 1.62.1 的本地 WebKit 只暴露 `--proxy` /
 *   `--proxy-bypass-list`，没有可靠的“关闭系统代理”启动选项；实测默认
 *   loopback 已直连（serverAddr 为 127.0.0.1:5187），因此不猜参数、保持默认。
 */
function systemProxyIsolation(browserName: DesktopBrowserName) {
  if (browserName === 'chromium') {
    return { launchOptions: { args: ['--no-proxy-server'] } };
  }
  if (browserName === 'firefox') {
    return { launchOptions: { firefoxUserPrefs: { 'network.proxy.type': 0 } } };
  }
  return {};
}

// 复用 workspace-tabs 专属配置（testMatch、单 worker、webServer、超时与产物），
// 只把项目扩展为三个桌面引擎；390px 用例仍由 spec 自身控制，不新增移动范围。
export default defineConfig({
  ...workspaceTabsConfig,
  projects: (['chromium', 'webkit', 'firefox'] as const satisfies readonly DesktopBrowserName[]).map(browserName => ({
    name: `${browserName}-desktop`,
    use: {
      browserName,
      viewport: { width: 1440, height: 1000 },
      ...systemProxyIsolation(browserName),
    },
  })),
});
