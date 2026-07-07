const { test, expect } = require('@playwright/test');

test('home podcast section renders videos from static JSON', async ({ page }) => {
  await page.route('**/data/youtube-videos.json', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      videos: [
        { id: 'abc123XYZ_0', title: 'Static JSON Episode One', date: 'Jul 2026' },
        { id: 'def456XYZ_1', title: 'Static JSON Episode Two', date: 'Jun 2026' },
      ],
    }),
  }));

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Static JSON Episode One')).toBeVisible();
  await expect(page.getByText('Static JSON Episode Two')).toBeVisible();
  await expect(page.locator('.podcast-card')).toHaveCount(2);
});
