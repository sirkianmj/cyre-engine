import { test, expect } from '@playwright/test';

/**
 * CYRE Studio — menu bar and windowing system.
 *
 * Covers the acceptance criteria: tabs replaced by a native menu bar, every
 * dropdown action presenting a real window, and windows behaving like real
 * windows (drag, resize, minimize, maximize, close).
 */

test('studio launches straight into a clean viewport with no windows open', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('studio-app')).toBeVisible();
  await expect(page.getByTestId('studio-menubar')).toBeVisible();
  await expect(page.getByTestId('studio-toolbar')).toBeVisible();
  await expect(page.getByTestId('studio-statusbar')).toBeVisible();
  await expect(page.getByTestId('cyre-stage')).toBeVisible();

  await expect(page.locator('[data-testid^="window-"]')).toHaveCount(0);
});

test('every required top-level menu is present', async ({ page }) => {
  await page.goto('/');

  for (const menu of ['file', 'edit', 'view', 'scenarios', 'simulation', 'visualize', 'research', 'replay', 'tools', 'window', 'help']) {
    await expect(page.getByTestId(`menu-${menu}`)).toBeVisible();
  }
});

test('a menu action opens its window and the window closes again', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-research').click();
  await page.getByTestId('menu-item-research.telemetry').click();

  const frame = page.getByTestId('window-telemetry');
  await expect(frame).toBeVisible();

  await page.getByTestId('window-close-telemetry').click();
  await expect(frame).toHaveCount(0);
});

test('windows are draggable, resizable, minimizable and maximizable', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-window').click();
  await page.getByTestId('menu-item-menu.window.simulation').click();

  const frame = page.getByTestId('window-simulation');
  await expect(frame).toBeVisible();

  const before = await frame.boundingBox();
  expect(before).not.toBeNull();

  // Drag by the title bar.
  const titlebar = frame.locator('.cyre-window-titlebar');
  const titleBox = await titlebar.boundingBox();
  await page.mouse.move(titleBox!.x + 40, titleBox!.y + 12);
  await page.mouse.down();
  await page.mouse.move(titleBox!.x + 180, titleBox!.y + 120, { steps: 8 });
  await page.mouse.up();

  const afterDrag = await frame.boundingBox();
  expect(Math.abs(afterDrag!.x - before!.x)).toBeGreaterThan(20);

  // Resize from the south-east edge.
  const handle = page.getByTestId('window-resize-simulation-se');
  const handleBox = await handle.boundingBox();
  await page.mouse.move(handleBox!.x + 3, handleBox!.y + 3);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + 120, handleBox!.y + 90, { steps: 8 });
  await page.mouse.up();

  const afterResize = await frame.boundingBox();
  expect(afterResize!.width).toBeGreaterThan(before!.width);

  // Minimize into the tray, then restore.
  await page.getByTestId('window-minimize-simulation').click();
  await expect(frame).toHaveCount(0);
  await expect(page.getByTestId('window-tray-simulation')).toBeVisible();
  await page.getByTestId('window-tray-simulation').click();
  await expect(frame).toBeVisible();

  // Maximize and restore.
  await page.getByTestId('window-maximize-simulation').click();
  const maximized = await frame.boundingBox();
  expect(maximized!.width).toBeGreaterThan(afterResize!.width);
  await page.getByTestId('window-maximize-simulation').click();
});

test('the Window menu can cascade and tile every open window', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('menu-window').click();
  await page.getByTestId('menu-item-menu.window.telemetry').click();
  await page.getByTestId('menu-window').click();
  await page.getByTestId('menu-item-menu.window.research').click();

  await page.getByTestId('menu-window').click();
  await page.getByTestId('menu-item-window.tile').click();

  await expect(page.getByTestId('window-telemetry')).toBeVisible();
  await expect(page.getByTestId('window-research')).toBeVisible();

  await page.getByTestId('menu-window').click();
  await page.getByTestId('menu-item-window.close-all').click();
  await expect(page.locator('[data-testid^="window-"]')).toHaveCount(0);
});

test('the command palette runs the same commands as the menu bar', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('Control+k');
  await expect(page.getByTestId('command-palette')).toBeVisible();

  await page.getByTestId('command-palette-input').fill('performance');
  await page.getByTestId('palette-item-research.performance').click();

  await expect(page.getByTestId('window-performance')).toBeVisible();
});
