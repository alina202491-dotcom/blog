import { XMLParser } from 'fast-xml-parser';

export interface Env {
  ASSETS: Fetcher; // pages assets or r2 bucket binding depending on deploy target
}

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

function normalize(item: any, author: string) {
  const title = item.title?.['#text'] || item.title || '';
  const link = item.link?.href || item.link?.[0]?.href || item.link || item.guid?.['#text'] || '';
  const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString();
  const content = item['content:encoded'] || item.description || item.summary || '';
  return {
    title: String(title).trim(),
    auther: author,
    date: new Date(pubDate).toISOString(),
    link: typeof link === 'string' ? link : (link?.[0] || ''),
    content: String(content).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 160)
  };
}

async function handleFriends(request: Request): Promise<Response> {
  const sourcesUrl = new URL('/friends-sources.json', request.url).toString();
  const res = await fetch(sourcesUrl, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) return new Response('[]', { headers: { 'content-type': 'application/json' } });
  const sources = await res.json();
  const timeline: any[] = [];
  await Promise.all(sources.map(async (src: any) => {
    try {
      const resp = await fetch(src.feed, { headers: { 'user-agent': 'friends-cf/1.0' } });
      if (!resp.ok) throw new Error('feed fail');
      const xml = await resp.text();
      const json = xmlParser.parse(xml);
      if (json.rss?.channel) {
        const items = Array.isArray(json.rss.channel.item) ? json.rss.channel.item : [json.rss.channel.item].filter(Boolean);
        const picked = items
          .map((i: any) => ({ ...normalize(i, src.name), name: src.name, site: src.site }))
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3);
        timeline.push(...picked);
      } else if (json.feed?.entry) {
        const entries = Array.isArray(json.feed.entry) ? json.feed.entry : [json.feed.entry];
        const picked = entries
          .map((i: any) => ({ ...normalize(i, src.name), name: src.name, site: src.site }))
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3);
        timeline.push(...picked);
      }
    } catch {}
  }));
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return new Response(JSON.stringify(timeline), { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=300' } });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/friends') {
      return handleFriends(request);
    }
    // fallback to static assets (Pages/Workers Sites binding)
    return env.ASSETS.fetch(request);
  }
};
