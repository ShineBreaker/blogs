import { expect, test } from '@playwright/test';

test('atom feed escapes summaries, declares the license and mirrors the home listing', async ({ page, request }) => {
  const response = await request.get('/atom.xml');
  expect(response.status()).toBe(200);
  const body = await response.text();

  expect(body).not.toContain('<![CDATA[');
  expect(body).toContain('CC BY 4.0');

  await page.goto('/');
  const cardCount = await page.locator('.post-card').count();
  expect((body.match(/<entry>/g) ?? []).length).toBe(cardCount);
});

test('search surfaces posts from the built pagefind index', async ({ page }) => {
  await page.goto('/search/');

  // 关键词刻意取自最早一批文章《Windows/Linux, 你该怎么选择？》的标题：
  // 搜索回归本质上依赖真实构建出的 pagefind 索引，标题词是最稳定的锚点。
  await page.locator('[data-search-input]').fill('选择');

  await expect(page.locator('[data-search-status]')).toContainText('找到');
  await expect(
    page.locator('[data-search-results] a').filter({ hasText: /Windows\/Linux/ }).first()
  ).toBeVisible();
});

test('unknown route lands on the 404 page', async ({ page }) => {
  const response = await page.goto('/definitely-not-a-page/');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'PAGE NOT FOUND' })).toBeVisible();
});
