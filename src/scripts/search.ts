type SearchResult = { data(): Promise<{ url: string; meta: { title: string }; excerpt: string }> };
type PagefindModule = {
  options(opts: { noWorker?: boolean }): Promise<void>;
  search(query: string): Promise<{ results: SearchResult[] }>;
};

function escapeHtml(value: string): string {
  const element = document.createElement('span');
  element.textContent = value;
  return element.innerHTML;
}

export function mountSearch(): void {
  const root = document.querySelector<HTMLElement>('[data-search-root]');
  const input = root?.querySelector<HTMLInputElement>('[data-search-input]');
  const status = root?.querySelector<HTMLElement>('[data-search-status]');
  const results = root?.querySelector<HTMLOListElement>('[data-search-results]');
  if (!root || !input || !status || !results) return;

  let pagefind: Promise<PagefindModule> | undefined;
  const load = () => {
    if (!pagefind) {
      const base = document.documentElement.dataset.siteRoot || '/';
      // noWorker:pagefind-worker.js 内的相对路径 fetch 在 Chromium 下无法解析根相对 URL,
      // 且本站索引很小,主线程搜索足够快。
      pagefind = (import(/* @vite-ignore */ `${base}pagefind/pagefind.js`) as Promise<PagefindModule>)
        .then(async (module) => {
          await module.options({ noWorker: true });
          return module;
        });
    }
    return pagefind;
  };

  let queryNumber = 0;
  let debounceTimer = 0;
  input.addEventListener('input', () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(async () => {
      const query = input.value.trim();
      const request = ++queryNumber;
      results.replaceChildren();
      if (!query) { status.textContent = '请输入关键词。'; return; }

      status.textContent = '正在检索索引…';
      try {
        const response = await load().then((module) => module.search(query));
        const data = await Promise.all(response.results.slice(0, 20).map((result) => result.data()));
        if (request !== queryNumber) return;
        status.textContent = data.length ? `找到 ${data.length} 条结果。` : '没有匹配的记录。';
        data.forEach((item) => {
          const result = document.createElement('li');
          result.innerHTML = `<a href="${escapeHtml(item.url)}"><h2>${escapeHtml(item.meta.title || 'UNTITLED')}</h2><p>${item.excerpt}</p></a>`;
          results.append(result);
        });
      } catch (_) {
        if (request === queryNumber) status.textContent = '搜索索引暂不可用，请在完整构建后重试。';
      }
    }, 150);
  });
}
