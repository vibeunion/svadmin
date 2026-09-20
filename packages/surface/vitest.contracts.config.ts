import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', pool: 'threads', maxWorkers: 1, fileParallelism: false,
    include: ['src/agent.test.ts', 'src/agent-contract.test.ts', 'src/agent-response.test.ts',
      'src/edits.test.ts', 'src/json.test.ts', 'src/source-cache.test.ts'],
  },
});
