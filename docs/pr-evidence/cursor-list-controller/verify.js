export default async function verifyCursorController(page, baseUrl = 'http://127.0.0.1:5286', outputDirectory) {
  const results = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    const errors = [];
    const captureError = error => errors.push(error.message);
    page.on('pageerror', captureError);
    await page.setViewportSize(viewport);
    await page.goto(`${baseUrl}/docs/pr-evidence/cursor-list-controller/fixture.html`);
    const ready = () => page.waitForFunction(() => document.body.dataset.loading === 'false');
    const rows = () => page.locator('#rows tr').allTextContents();
    const equal = (actual, expected, message) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error(message);
    };
    await ready();const first = await rows();
    if (!await page.locator('#previous').isDisabled()) throw Error('First page must disable previous');
    await page.locator('#next').press('Enter');await ready();const second = await rows();
    if (second.length !== 2 || second.some(row => first.includes(row))) throw Error('Page replacement failed');
    await page.locator('#fail').click();await ready();
    equal(await rows(), second, 'Failed navigation changed records');
    equal(await page.locator('#page').innerText(), 'Page 2', 'Failed navigation changed page');
    await page.locator('#next').press('Enter');await ready();const last = await rows();
    if (last.length !== 1 || !await page.locator('#next').isDisabled() || await page.locator('#previous').isDisabled()) throw Error('Last page boundary');
    await page.locator('#previous').click();await ready();equal(await rows(), second, 'Previous page');

    await page.locator('#fail-query').click();await ready();
    equal(await rows(), second, 'Failed query changed records');
    equal(await page.locator('#page').innerText(), 'Page 2', 'Failed query changed page');
    equal(await page.locator('#applied').innerText(), 'Applied: open', 'Failed query changed applied query');
    if (outputDirectory) await page.screenshot({ path: `${outputDirectory}/${viewport.width}x${viewport.height}.png` });
    await page.locator('#retry').click();await ready();
    equal(await page.locator('#applied').innerText(), 'Applied: closed', 'Query retry used the wrong query');
    equal(await page.locator('#page').innerText(), 'Page 1', 'Query retry did not reset the page');
    await page.locator('#open').click();await ready();await page.locator('#next').click();await ready();
    await page.locator('#query').click();await ready();
    equal(await page.locator('#page').innerText(), 'Page 1', 'Explicit same-key query did not reset');
    await page.locator('#next').click();await ready();await page.locator('#clear').click();await ready();
    equal(await page.locator('#page').innerText(), 'Page 1', 'Clear did not reset');
    equal(await page.locator('#applied').innerText(), 'Applied: all', 'Clear did not apply');

    await page.locator('#open').click();await ready();
    await page.locator('#hang').click();
    await page.waitForFunction(() => document.body.dataset.loading === 'true');
    await page.locator('#cancel').click();await ready();
    await page.waitForFunction(() => document.body.dataset.actionSettled === 'true');
    equal(await rows(), first, 'Cancellation changed the applied records');
    await page.locator('#scope-change').click();
    equal(await rows(), [], 'Scope change retained old-scope records');await ready();
    equal(await rows(), [], 'Scope failure restored old-scope records');
    equal(await page.locator('#scope').innerText(), 'tenant-b:tasks', 'Scope key did not update');
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (pageOverflow || errors.length) throw Error(`Browser errors: ${JSON.stringify({ pageOverflow, errors })}`);
    results.push({ viewport, first, second, last, queryReset: true, failureRetained: true,
      queryFailureRetained: true, queryRetryApplied: true, sameKeyReset: true, clearReset: true,
      ignoredCancellationSettled: true, scopeCleared: true, pageErrors: errors.length, pageOverflow });
    page.off('pageerror', captureError);
  }
  return results;
}
