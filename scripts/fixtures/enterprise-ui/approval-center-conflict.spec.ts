import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const screenshots = fileURLToPath(new URL('../../../output/playwright/approval-center-conflict-20261022', import.meta.url));

test('Approval center keeps the draft and pending record across a real version conflict', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=approval&conflict-action');
  const center = page.getByTestId('approval-fixture').getByRole('region', { name: 'Approval center' });
  await expect(center.getByRole('heading', { name: 'Expense request', exact: true })).toBeVisible();
  await expect(center.getByText('Alice · pending', { exact: true })).toBeVisible();
  await expect(page.getByTestId('approval-reads')).toHaveText('1');

  await center.getByRole('button', { name: 'Approve', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const comment = dialog.getByRole('textbox', { name: 'Comment', exact: true });
  await comment.fill('Keep receipt');
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();

  await expect(dialog.getByRole('alert')).toContainText('This request changed. Refresh before acting.');
  await expect(dialog).toBeVisible();
  await expect(comment).toHaveValue('Keep receipt');
  await expect(page.getByTestId('approval-transitions')).toHaveText('1');
  await expect(center.getByText('Alice · pending', { exact: true })).toBeVisible();
  await expect(center.getByText('approved', { exact: true })).toHaveCount(0);
  await expect(center.getByRole('button', { name: 'Approve', exact: true })).toBeVisible();

  const transition = JSON.parse(await page.getByTestId('approval-transition').innerText()) as {
    id: string; expectedVersion: number; action: string; comment: string; idempotencyKey: string;
  };
  expect(transition).toMatchObject({
    id: 'request-1', expectedVersion: 2, action: 'approve', comment: 'Keep receipt',
  });
  expect(transition.idempotencyKey).toMatch(/^request-1:2:approve:/);
  const transitionContext = JSON.parse(await page.getByTestId('approval-transition-context').innerText()) as {
    tenantId: string; requestId: string; traceId: string;
  };
  expect(Object.keys(transitionContext).sort()).toEqual(['requestId', 'tenantId', 'traceId']);
  expect(transitionContext.tenantId).toBe('tenant-a');
  expect(transitionContext.requestId).not.toBe('');
  expect(transitionContext.traceId).toBe(transitionContext.requestId);

  await mkdir(screenshots, { recursive: true });
  await page.screenshot({ path: `${screenshots}/${testInfo.project.name}-conflict.png`, fullPage: true });

  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(center.getByText('Alice · pending', { exact: true })).toBeVisible();
  await center.getByRole('button', { name: 'Refresh', exact: true }).click();

  await expect(page.getByTestId('approval-reads')).toHaveText('2');
  await expect(center.getByText('Alice · approved', { exact: true })).toBeVisible();
  await expect(center.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('approval-transitions')).toHaveText('1');
  await page.screenshot({ path: `${screenshots}/${testInfo.project.name}-refreshed.png`, fullPage: true });
  expect(errors).toEqual([]);
});
