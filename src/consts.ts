export const SITE = {
  title: 'EagMore',
  subtitle: "I'm still waiting for you.",
  description: 'Self blog.',
  author: 'BrokenShine',
  // 仅 origin（不含 base 路径）；拼接完整 URL 时要带上 BASE。
  url: 'https://shinebreaker.github.io',
} as const;

/** 站点 base 路径（`/blogs`，无尾斜杠），构建时由 Astro 内联。 */
export const BASE = import.meta.env.BASE_URL;

/** 拼接 base 前缀：Astro 不会自动改写组件里的手写根相对链接。 */
export const withBase = (path: string): string => `${BASE}${path}`;

export const MENU = [
  { label: 'Home', href: withBase('/') },
  { label: 'Archives', href: withBase('/archives') },
  { label: 'Tags', href: withBase('/tags') },
  { label: 'Categories', href: withBase('/categories') },
  { label: 'Codeberg', href: 'https://codeberg.org/BrokenShine' },
  { label: 'Gitee', href: 'https://gitee.com/brokenshine' },
  { label: 'GitHub', href: 'https://github.com/hejianxian' },
  { label: 'Bilibili', href: 'https://space.bilibili.com/310949242' },
] as const;

export const RSS = withBase('/atom.xml');

export const EXCERPT_LENGTH = 220;

export const PALETTE = {
  default: 'gruvbox-dark-hard',
  schemes: [
    { id: 'gruvbox-dark-hard', name: 'Gruvbox Dark Hard', signature: '#fe8019', variant: 'dark' },
    { id: 'nord', name: 'Nord', signature: '#88c0d0', variant: 'dark' },
    { id: 'solarized-dark', name: 'Solarized Dark', signature: '#2aa198', variant: 'dark' },
    { id: 'dracula', name: 'Dracula', signature: '#ea51b2', variant: 'dark' },
    { id: 'one-dark', name: 'One Dark', signature: '#61afef', variant: 'dark' },
    { id: 'default-light', name: 'Default Light', signature: '#7cafc2', variant: 'light' },
  ],
} as const;

export const GLOBE = { enabled: true } as const;

/** 文章内容的授权协议（CC BY 4.0）。 */
export const CONTENT_LICENSE = {
  name: 'CC BY 4.0',
  url: 'https://creativecommons.org/licenses/by/4.0/deed.zh-hans',
} as const;
