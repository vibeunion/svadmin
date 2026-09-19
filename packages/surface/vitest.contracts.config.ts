import { defineConfig } from 'vitest/config';

// 纯协议测试独立于浏览器、组件打包和其他 workspace 的构建结果。
export default defineConfig({
  test: {
    environment: 'node',
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
    include: [
      'src/agent.test.ts',
      'src/agent-contract.test.ts',
      'src/agent-response.test.ts',
      'src/edits.test.ts',
      'src/json.test.ts',
    ],
  },
});
