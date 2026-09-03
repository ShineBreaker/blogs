import { expect, test } from '@playwright/test';

test('atom feed escapes summaries, declares the license and mirrors the home listing', async ({ page, request }) => {
  const response = await request.get('/atom.xml');
  expect(response.status()).toBe(200);
  const body = await response.text();

  expect(body).not.toContain('<![CDATA[');
  expect(body).toContain('CC BY 4.0');

  await page.goto('/');
  // 首页只渲染前 10 篇（PAGE_SIZE），feed 含全部文章，条目数不可能相等；
  // 改为子集校验：首页每篇文章的路径都必须出现在 feed 的 <link href> 中。
  const feedLinks = new Set<string>();
  for (const match of body.matchAll(/<link href="([^"]+)"/g)) {
    if (match[1]) feedLinks.add(new URL(match[1]).pathname);
  }
  const cardLinks = await page.locator('.post-card h2 a').evaluateAll((anchors) =>
    anchors.map((anchor) => {
      const href = anchor.getAttribute('href');
      if (!href) throw new Error('Post card link is missing an href');
      return new URL(href, location.origin).pathname;
    })
  );
  expect(cardLinks.length).toBeGreaterThan(0);
  for (const cardLink of cardLinks) {
    expect(feedLinks).toContain(cardLink);
  }
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
