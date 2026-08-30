import { test, expect } from '@playwright/test';

/**
 * Production-build smoke test: the built Studio bundle must boot straight
 * into the editor workspace with no boot gate and no home screen.
 */

test('production build loads directly into the editor workspace', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('studio-app')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('studio-menubar')).toBeVisible();
  await expect(page.getByTestId('cyre-stage')).toBeVisible();
});

test('production build can open a window from the menu bar', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-help').click();
  await page.getByTestId('menu-item-help.about').click();

  await expect(page.getByTestId('window-about')).toBeVisible();
  await expect(page.getByTestId('window-about')).toContainText('CYRE Studio');
});
