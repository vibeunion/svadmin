import { strict as assert } from 'node:assert';
import { preview } from 'vite';
import { dataProvider, resources } from '../src/lib/admin';

async function assertServerRenderedPage(baseUrl: string, path: string, expected?: string | RegExp) {
  const response = await fetch(new URL(path, baseUrl));
  const html = await response.text();
  assert.equal(response.status, 200, `GET ${path} returned ${response.status}`);
  if (typeof expected === 'string') {
    assert.ok(html.includes(expected), `${path} missing expected content ${expected}`);
  } else if (expected) {
    assert.match(html, expected, `${path} missing expected content ${expected}`);
  }
  assert.doesNotMatch(html, /<script\b/iu, `${path} contained unexpected script tags`);
  assert.doesNotMatch(html, /<(?:details|summary)\b/iu, `${path} contained unsupported disclosure markup`);
  return html;
}

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
  const html = await assertServerRenderedPage(baseUrl, '/lite', /Lite SSR/u);
  assert.match(html, /Lite SSR/u);
  assert.match(html, /IE11 SSR contract/u);
  assert.match(html, /<form[^>]+method="GET"/u);
  assert.match(html, /<form[^>]+method="POST"[^>]+action="\?\/delete"/u);
  // 2. Every configured resource list and applicable CRUD page.
  let checkedRoutes = 1;
  for (const resource of resources) {
    await assertServerRenderedPage(baseUrl, `/lite/${resource.name}`, resource.label);
    checkedRoutes += 1;

    if (resource.canCreate !== false) {
      await assertServerRenderedPage(baseUrl, `/lite/${resource.name}/create`);
      checkedRoutes += 1;
    }

    const list = await dataProvider.getList({
      resource: resource.name,
      pagination: { current: 1, pageSize: 1 },
    });
    const firstRecord = list.data[0] as Record<string, unknown> | undefined;
    const recordId = firstRecord?.[resource.primaryKey ?? 'id'];
    if (recordId == null) continue;
    if (resource.canShow !== false) {
      await assertServerRenderedPage(baseUrl, `/lite/${resource.name}/show/${recordId}`);
      checkedRoutes += 1;
    }
    if (resource.canEdit !== false) {
      await assertServerRenderedPage(baseUrl, `/lite/${resource.name}/edit/${recordId}`);
      checkedRoutes += 1;
    }
  }

  // 3. Browser-only capabilities keep independent SSR fallbacks and downloads.
  const compatibilityHtml = await assertServerRenderedPage(
    baseUrl,
    '/lite/compatibility',
    /Compatibility Fallbacks/u,
  );
  assert.match(compatibilityHtml, /Canvas \/ WebGL \/ Flow UI/u);
  assert.match(compatibilityHtml, /WASM \/ Worker/u);
  assert.match(compatibilityHtml, /ZIP archive fallback/u);
  checkedRoutes += 1;

  const parityHtml = await assertServerRenderedPage(baseUrl, '/lite/parity', /72\s*\/\s*72/u);
  assert.match(parityHtml, /72\s*\/\s*72/u);
  checkedRoutes += 1;

  for (const path of ['/lite/compatibility/flow.json', '/lite/compatibility/result.json']) {
    const response = await fetch(new URL(path, baseUrl));
    assert.equal(response.status, 200, `GET ${path} returned ${response.status}`);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/u);
  }

  console.info(`Lite SSR response: ${checkedRoutes} HTML routes verified with native forms and no hydration script`);
} finally {
  await new Promise<void>((resolve, reject) => {
    server.httpServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
