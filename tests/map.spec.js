import { test, expect } from '@playwright/test';

test('has title and map container', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/.*OpenFireMap.*/);

    // Expect the map container to be visible
    const mapContainer = page.locator('#map');
    await expect(mapContainer).toBeVisible();
});
