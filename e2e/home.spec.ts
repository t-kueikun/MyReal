import { test, expect } from '@playwright/test';

test('home loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('描いて作る、今だけのキャラクター')).toBeVisible();
});
