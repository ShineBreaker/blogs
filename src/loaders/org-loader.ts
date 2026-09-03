import { readdirSync, readFileSync } from 'node:fs';
import { basename, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Loader, LoaderContext } from 'astro/loaders';
import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import { extractKeywords } from 'uniorg-extract-keywords';
import uniorg2rehype from 'uniorg-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { z } from 'astro/zod';
import { normalizeHeadings } from '../utils/excerpt';

export interface OrgLoaderOptions {
  /** Directory containing `.org` files, relative to the project root. */
  base: string;
}

/**
 * Parse an Org active timestamp (`<2026-03-03 Sun 02:46>`) or plain date
 * (`2026-03-03`) into a local-time `Date`. Missing components default to
 * midnight, matching how Hexo treated `date:` front matter.
 */
function parseOrgDate(value: string): Date {
  const body = value.trim().replace(/^[<[]|[>\]]$/g, '');
  const match = body.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+\S+)?(?:\s+(\d{2}):(\d{2}))?/);
  if (!match) return new Date(NaN);
  const [, year, month, day, hour = '0', minute = '0'] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

/** Split `:tag1:tag2:` filetags into a cleaned tag list. */
function splitFiletags(value: string): string[] {
  return value
    .split(':')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** Extract `h2`–`h6` headings (with their slug ids) from rendered HTML. */
function extractHeadings(html: string): Array<{ depth: number; slug: string; text: string }> {
  const headings: Array<{ depth: number; slug: string; text: string }> = [];
  // `id` may not stay the first attribute if a future rehype plugin adds
  // properties before it, so allow attributes in any position.
  for (const match of html.matchAll(/<h([2-6])\s[^>]*?\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)) {
    const [, depth, slug, text] = match;
    if (depth === undefined || slug === undefined || text === undefined) continue;
    headings.push({
      depth: Number(depth),
      slug,
      text: text.replace(/<[^>]+>/g, '').trim(),
    });
  }
  return headings;
}

/**
 * Custom Astro content loader that turns `.org` files into structured
 * collection entries: Org keywords become front matter, the body is rendered
 * to highlighted HTML and stored so `render(entry)` works in components.
 */
export function orgLoader(options: OrgLoaderOptions): Loader {
  // `import.meta.url` points at the compiled loader in `.astro/`; the
  // collection root is the project root that Astro resolves `base` against.
  const baseDir = resolve(process.cwd(), options.base);

  const findFiles = (): string[] => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile() && entry.name.endsWith('.org')) {
          files.push(full);
        }
      }
    };
    walk(baseDir);
    return files;
  };

  /** Entry id: root-relative path with forward slashes, matching store keys. */
  const entryId = (file: string, context: LoaderContext): string =>
    relative(fileURLToPath(context.config.root), file).split(sep).join('/');

  const processFile = async (file: string, context: LoaderContext) => {
    const raw = readFileSync(file, 'utf8');
    const filePath = entryId(file, context);

    const fileData = await unified()
      .use(uniorgParse)
      .use(extractKeywords)
      .use(uniorg2rehype)
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings, {
        behavior: 'prepend',
        properties: { class: 'headerlink' },
        content: { type: 'text', value: '' },
      })
      .use(rehypeHighlight, { detect: false })
      .use(rehypeStringify)
      .process(raw);

    const keywords = fileData.data as Record<string, string | undefined>;
    const html = normalizeHeadings(String(fileData));
    const headings = extractHeadings(html);
    if (/<h[2-6][\s>]/.test(html) && headings.length === 0) {
      // The html clearly contains h2-h6 tags yet none were parsed — the
      // heading regex no longer fits the rendered markup. Surface it instead
      // of dropping the TOC silently; posts with no headings stay quiet.
      context.logger.warn(`[org-loader] ${filePath}: html contains h2-h6 tags but the heading regex matched none`);
    }

    const data = await context.parseData({
      id: filePath,
      data: {
        title: keywords.title ?? 'UNTITLED',
        date: keywords.date ? parseOrgDate(keywords.date) : new Date(NaN),
        tags: splitFiletags(keywords.filetags ?? ''),
        categories: splitFiletags(keywords.category ?? ''),
        description: keywords.description,
      },
      filePath,
    });

    return {
      id: filePath,
      data,
      filePath,
      rendered: { html, metadata: { headings } },
    };
  };

  // `load` may be called again (e.g. when Astro refreshes the collection),
  // so register the watcher once — otherwise each call would stack a fresh
  // set of listeners.
  let watched = false;

  const load = async (context: LoaderContext): Promise<void> => {
    const files = findFiles();
    context.store.clear();
    for (const file of files) {
      try {
        context.store.set(await processFile(file, context));
      } catch (error) {
        context.logger.error(`[org-loader] failed to parse ${file}: ${String(error)}`);
      }
    }

    // Keep the dev server in sync when `.org` files change, re-parsing only
    // the affected entry instead of rebuilding the whole collection.
    const watcher = context.watcher;
    if (watcher && !watched) {
      watched = true;
      for (const event of ['add', 'change', 'unlink'] as const) {
        watcher.on(event, (changed: string | URL) => {
          const changedPath = typeof changed === 'string' ? changed : fileURLToPath(changed);
          // The dev watcher observes the whole project root, but only files
          // inside `baseDir` belong to this collection — injecting an Org
          // file from elsewhere (e.g. drafts under docs/) would make dev
          // content diverge from build.
          // Trailing `sep` keeps in-dir names that merely start with `..`
          // (e.g. `..draft.org`) inside the collection, while real escapes
          // (`../…`) still bail out.
          if (relative(baseDir, changedPath).startsWith('..' + sep)) return;
          if (!changedPath.endsWith('.org')) return;
          // Emacs lock files (`.#draft.org`) are dangling symlinks; reading
          // them always fails, so skip them instead of logging noise.
          if (basename(changedPath).startsWith('.#')) return;
          if (event === 'unlink') {
            context.store.delete(entryId(changedPath, context));
            return;
          }
          void processFile(changedPath, context)
            .then((entry) => context.store.set(entry))
            .catch((error: unknown) => {
              context.logger.error(`[org-loader] failed to parse ${changedPath}: ${String(error)}`);
            });
        });
      }
    }
  };

  return {
    name: 'org-loader',
    load,
    schema: z.object({
      title: z.string().default('UNTITLED'),
      date: z.coerce.date(),
      // Loader always supplies these two fields (splitFiletags returns an
      // array), so they are non-optional: no `.default([])` which would make
      // the inferred type `string[] | undefined` at call sites.
      tags: z.array(z.string()),
      categories: z.array(z.string()),
      description: z.string().optional(),
    }),
  };
}
