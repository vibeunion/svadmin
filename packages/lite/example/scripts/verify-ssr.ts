import { strict as assert } from 'node:assert';
import { preview } from 'vite';

const server = await preview({
  preview: {
    host: '127.0.0.1',
    port: 0,
    strictPort: true,
  },
});

try {
  const baseUrl = server.resolvedUrls?.local[0];
  assert(baseUrl, 'Vite preview did not expose a local URL');

  const response = await fetch(new URL('/lite', baseUrl));
  const html = await response.text();

  assert.equal(response.status, 200, `GET /lite returned ${response.status}`);
  assert.match(html, /Lite SSR/u);
  assert.match(html, /IE11 SSR contract/u);
  assert.match(html, /<form[^>]+method="GET"/u);
  assert.match(html, /<form[^>]+method="POST"[^>]+action="\?\/delete"/u);
  assert.doesNotMatch(html, /<script\b/iu);
  assert.doesNotMatch(html, /<(?:details|summary)\b/iu);

  console.info('Lite SSR response: 200, native GET/POST forms, no hydration script');
} finally {
  await new Promise<void>((resolve, reject) => {
    server.httpServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
