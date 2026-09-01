import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { aiElementsSsrNoExternal } from './vite.ssr.config.mjs';

const server = await createServer({
  configFile: fileURLToPath(new URL('./vite.ssr.config.mjs', import.meta.url)),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  const loaded = await server.ssrLoadModule('/ssr-entry.ts');
  const rendered = loaded.runSsrSmoke();

  if (rendered.exportCount !== 49) {
    throw new Error('Packed SSR consumer did not load the complete AI Elements surface');
  }
  if (
    !rendered.conversation.includes('aria-label="Conversation"') ||
    !rendered.context.includes('Context window')
  ) {
    throw new Error('Packed AI Elements SSR output is incomplete');
  }

  console.info(
    'packed AI Elements Vite SSR consumer passed:',
    aiElementsSsrNoExternal.join(', '),
  );
} finally {
  await server.close();
}
