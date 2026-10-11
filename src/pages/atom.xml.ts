import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { BASE, CONTENT_LICENSE, SITE } from '../consts';
import { postUrl } from '../utils/post';
import { sortPosts } from '../utils/pagination';
import { toPlainText } from '../utils/excerpt';

export const prerender = true;

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

function formatAtomDate(date: Date): string {
  return date.toISOString();
}

function entryXml(post: CollectionEntry<'posts'>, index: number, total: number): string {
  const url = `${SITE.url}${postUrl(post)}`;
  const updated = formatAtomDate(post.data.date);
  const tags = post.data.tags
    .map((tag) => `    <category term="${escapeXml(tag)}" scheme="${SITE.url}${BASE}/tags/${encodeURIComponent(tag)}/"/>`)
    .join('\n');

  return `  <entry>
    <author>
      <name>${escapeXml(SITE.author)}</name>
    </author>
${tags}
    <content type="html">${escapeXml(post.rendered?.html ?? '')}</content>
    <id>${url}</id>
    <link href="${url}"/>
    <published>${updated}</published>
    <summary>${escapeXml(toPlainText(post.rendered?.html ?? ''))}</summary>
    <title>${escapeXml(post.data.title ?? 'UNTITLED')}</title>
    <updated>${updated}</updated>
  </entry>${index < total - 1 ? '\n' : ''}`;
}

export async function GET() {
  const posts = sortPosts(await getCollection('posts'));
  const latest = posts[0];
  const updated = latest ? formatAtomDate(latest.data.date) : formatAtomDate(new Date());

  const body = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <author>
    <name>${escapeXml(SITE.author)}</name>
  </author>
  <id>${SITE.url}${BASE}/</id>
  <link href="${SITE.url}${BASE}/" rel="alternate"/>
  <link href="${SITE.url}${BASE}/atom.xml" rel="self"/>
  <rights>© ${new Date().getFullYear()} ${escapeXml(SITE.author)} · ${CONTENT_LICENSE.name}</rights>
  <subtitle>${escapeXml(SITE.subtitle)}</subtitle>
  <title>${escapeXml(SITE.title)}</title>
  <updated>${updated}</updated>
${posts.map((post, index) => entryXml(post, index, posts.length)).join('\n')}
</feed>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
}
