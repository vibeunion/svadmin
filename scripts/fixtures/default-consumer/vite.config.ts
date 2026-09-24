import { resolve } from 'node:path';
import { mergeConfig } from 'vite';
import generated from './vite.generated.config.js';

export default mergeConfig(generated, {
  build: { rollupOptions: { input: { app: resolve('index.html'), bare: resolve('bare.html') } } },
});
