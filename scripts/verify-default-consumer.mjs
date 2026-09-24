import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';

const baseURL = process.env.CONSUMER_URL ?? 'http://127.0.0.1:4185';
const output = resolve(process.env.CONSUMER_EVIDENCE ?? 'output/default-consumer');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let failure = false;
let pendingReads;
const records = {
  posts: [
    { id: 1, userId: 1, title: 'Review inventory', body: 'Check the incoming shipment.' },
    { id: 2, userId: 1, title: 'Prepare weekly report', body: 'Summarize completed orders.' },
  ],
  users: [{
    id: 1, name: 'Ada', username: 'ada', email: 'ada@example.test', phone: '123456789',
    website: 'example.test',
    address: { street: 'Main', suite: '', city: 'Test', zipcode: '10000', geo: { lat: '0', lng: '0' } },
    company: { name: 'Example', catchPhrase: '', bs: '' },
  }],
  comments: [{ id: 1, postId: 1, name: 'Reviewed', email: 'ada@example.test', body: 'Ready.' }],
  todos: [{ id: 1, userId: 1, title: 'Review order', completed: false }],
};
const mutations = [];
const requests = [];

// 所有演示 API 都在浏览器中拦截；验收不能写入外部服务。
await page.route('https://jsonplaceholder.typicode.com/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  const [resource, rawId] = url.pathname.split('/').filter(Boolean);
  requests.push({ method: request.method(), path: url.pathname, query: url.search });
  const rows = records[resource];
  assert.ok(rows, `Unexpected resource ${resource}`);
  if (pendingReads && request.method() === 'GET') await pendingReads;
  if (failure && request.method() === 'GET') {
    await route.fulfill({ status: 503, json: { message: 'Temporarily unavailable' } });
    return;
  }
  const id = rawId === undefined ? undefined : Number(rawId);
  let result;
  if (request.method() === 'GET') {
    result = id === undefined ? rows : rows.find(row => row.id === id);
    if (Array.isArray(result)) {
      const q = url.searchParams.get('q');
      if (q) result = result.filter(row => JSON.stringify(row).toLowerCase().includes(q.toLowerCase()));
      const start = Number(url.searchParams.get('_start') ?? 0);
      const end = Number(url.searchParams.get('_end') ?? result.length);
      result = result.slice(start, end);
    }
  } else if (request.method() === 'POST') {
    result = { ...request.postDataJSON(), id: Math.max(0, ...rows.map(row => row.id)) + 1 };
    rows.push(result);
    mutations.push('create');
  } else if (['PUT', 'PATCH'].includes(request.method())) {
    const index = rows.findIndex(row => row.id === id);
    assert.notEqual(index, -1);
    result = { ...rows[index], ...request.postDataJSON() };
    rows[index] = result;
    mutations.push('update');
  } else if (request.method() === 'DELETE') {
    const index = rows.findIndex(row => row.id === id);
    assert.notEqual(index, -1);
    [result] = rows.splice(index, 1);
    mutations.push('delete');
  } else {
    throw new Error(`Unexpected mutation method ${request.method()}`);
  }
  await route.fulfill({
    status: result === undefined ? 404 : 200,
    json: result ?? { message: 'Not found' },
    headers: { 'x-total-count': String(rows.length), 'access-control-expose-headers': 'x-total-count' },
  });
});

async function checkLayout(name) {
  await expect(page.locator('[data-svadmin-main]')).toBeVisible();
  await expect(page.locator('[data-svadmin-main]').getByRole('heading', { level: 1 })).toHaveCount(1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, name);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {})));
  });
  const clippedSections = await page.locator('[data-svadmin-page-section]').evaluateAll(sections =>
    sections.filter(section => [...section.children].some(child =>
      child.getBoundingClientRect().right > section.getBoundingClientRect().right + 1)).length);
  assert.equal(clippedSections, 0, `${name}: section children overflow`);
  await page.screenshot({ path: resolve(output, `${name}.png`), fullPage: true });
}

try {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const mode of ['light', 'dark']) {
      await page.goto(`${baseURL}/bare.html`);
      await page.evaluate(mode => {
        localStorage.setItem('svadmin-theme', mode);
        localStorage.removeItem('svadmin-color-theme');
      }, mode);
      await page.reload();
      await expect(page.locator('html')).toHaveClass(/layout-clean-flat/);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'stripe');
      await expect(page.locator('html')).toHaveAttribute('data-theme-mode', mode);
      await expect(page.getByRole('region', { name: 'Posts', exact: true }).getByRole('button', { name: /view all/i })).toBeVisible();
      await checkLayout(`bare-${mode}-${width}`);
      await page.goto(`${baseURL}/`);
      await expect(page.locator('[data-svadmin-dashboard-metrics] [data-svadmin-metric-card]')).toHaveCount(3);
      await expect(page.getByText('Review inventory', { exact: true }).filter({ visible: true }).first()).toBeVisible();
      await checkLayout(`scaffold-${mode}-${width}`);
      if (width === 1440 && mode === 'light') {
        const posts = page.getByRole('region', { name: 'Posts', exact: true });
        const users = page.getByRole('region', { name: 'Users', exact: true });
        await posts.getByRole('textbox', { name: 'Search...', exact: true }).fill('inventory');
        await expect(users.getByRole('textbox', { name: 'Search...', exact: true })).toHaveValue('');
        await expect(page).not.toHaveURL(/[?&]q=/);
        await posts.getByRole('textbox', { name: 'Search...', exact: true }).fill('');
        await posts.getByRole('button', { name: 'Detail', exact: true }).filter({ visible: true }).first().click();
        await expect(page.getByRole('dialog')).toHaveCount(1);
        await expect(page.getByRole('dialog')).toContainText('Review inventory');
        await expect(page).not.toHaveURL(/[?&]detail=/);
        await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
      }
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseURL}/bare.html#/posts/create`);
  await page.getByLabel('Title', { exact: false }).fill('Consumer acceptance');
  await page.getByLabel('Body', { exact: false }).fill('Created through the default form.');
  await page.getByLabel('Author', { exact: false }).fill('1');
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect.poll(() => mutations.includes('create')).toBe(true);
  const created = records.posts.find(row => row.title === 'Consumer acceptance');
  assert.ok(created);
  await page.goto(`${baseURL}/bare.html#/posts/edit/${created.id}`);
  await page.getByLabel('Title', { exact: false }).fill('Consumer updated');
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect.poll(() => mutations.includes('update')).toBe(true);
  await page.goto(`${baseURL}/bare.html#/posts/show/${created.id}`);
  await expect(page.getByText('Consumer updated', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await checkLayout('default-detail');
  await page.goto(`${baseURL}/bare.html#/posts`);
  await expect(page.getByText('Consumer updated', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await checkLayout('default-list');

  failure = true;
  await page.reload();
  await expect(page.locator('[data-svadmin-main]').getByRole('button', { name: /retry/i }).first()).toBeVisible({ timeout: 45_000 });
  failure = false;
  await page.locator('[data-svadmin-main]').getByRole('button', { name: /retry/i }).first().click();
  await expect(page.getByText('Consumer updated', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.goto(`${baseURL}/bare.html#/posts/show/${created.id}`);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect.poll(() => mutations.includes('delete')).toBe(true);
  await expect.poll(() => records.posts.some(row => row.id === created.id)).toBe(false);
  records.posts = [];
  let releaseReads;
  pendingReads = new Promise(resolve => { releaseReads = resolve; });
  await page.goto(`${baseURL}/bare.html#/posts`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-svadmin-main] [data-slot="skeleton"]').first()).toBeVisible();
  releaseReads();
  pendingReads = undefined;
  await expect(page.locator('[data-svadmin-main]').getByRole('status').first()).toBeVisible();
  await expect(page.getByText('Consumer updated', { exact: true })).toHaveCount(0);
  await checkLayout('default-empty');
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'result.json'), JSON.stringify({
    baseURL, viewports: [1440, 390], modes: ['light', 'dark'],
    mutations, pageErrors: errors, status: 'PASS',
  }, null, 2));
  console.info(`Default consumer verified: ${output}`);
} catch (error) {
  await writeFile(resolve(output, 'failure.json'), JSON.stringify({ requests, records, errors, error: String(error) }, null, 2));
  await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true });
  throw error;
} finally {
  await browser.close();
}
