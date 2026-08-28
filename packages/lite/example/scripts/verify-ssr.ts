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

  // 1. Root /lite dashboard and quick posts test table
  const response = await fetch(new URL('/lite', baseUrl));
  const html = await response.text();

  assert.equal(response.status, 200, `GET /lite returned ${response.status}`);
  assert.match(html, /Lite SSR/u);
  assert.match(html, /IE11 SSR contract/u);
  assert.match(html, /<form[^>]+method="GET"/u);
  assert.match(html, /<form[^>]+method="POST"[^>]+action="\?\/delete"/u);
  assert.doesNotMatch(html, /<script\b/iu);
  assert.doesNotMatch(html, /<(?:details|summary)\b/iu);

  // 2. Dynamic resource routes verification (Plan A)
  const resourceRoutes = [
    { path: '/lite/products', match: /Laptop Pro 15/u },
    { path: '/lite/products/show/1', match: /Laptop Pro 15/u },
    { path: '/lite/products/create', match: /Products/u },
    { path: '/lite/products/edit/1', match: /LAP-PRO-15/u },
    { path: '/lite/users', match: /Users/u },
    { path: '/lite/categories', match: /Categories/u },
    { path: '/lite/sales_orders', match: /Sales Orders/u },
    { path: '/lite/todos', match: /Todo/u },
  ];

  for (const item of resourceRoutes) {
    const res = await fetch(new URL(item.path, baseUrl));
    const pageHtml = await res.text();
    assert.equal(res.status, 200, `GET ${item.path} returned ${res.status}`);
    assert.match(pageHtml, item.match, `${item.path} missing expected content ${item.match}`);
    assert.doesNotMatch(pageHtml, /<script\b/iu, `${item.path} contained unexpected script tags`);
  }

  console.info('Lite SSR response: 200, native GET/POST forms, dynamic catch-all routes verified, no hydration script');
} finally {
  await new Promise<void>((resolve, reject) => {
    server.httpServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
