import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://shinebreaker.github.io',
  // GitHub Pages 项目站（仓库 blogs）把 dist 部署在 /blogs/ 下；
  // 根路径不再属于本站。手写链接必须经 consts.ts 的 BASE 拼接前缀。
  base: '/blogs',
  integrations: [sitemap()],
});
