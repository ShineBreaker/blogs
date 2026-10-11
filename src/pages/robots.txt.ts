import { BASE, SITE } from '../consts';

export const prerender = true;

export function GET() {
  return new Response(`User-agent: *
Allow: /

Sitemap: ${SITE.url}${BASE}/sitemap-index.xml
`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
