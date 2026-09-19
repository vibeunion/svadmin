import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// 对实际生产包运行相同业务断言，避免 Vite 冷转换/HMR 影响首次懒加载。
// 保留基础项目、追踪和重试策略；CI 的 --fail-on-flaky-tests 不允许重试掩盖失败。
export default defineConfig({
  ...base,
  testMatch: 'health-office.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'cd example && bunx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
