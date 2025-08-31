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

async function handleFriends(request: Request, env: Env): Promise<Response> {
  const assetsUrl = new URL('/friends-sources.json', request.url).toString();
  // 优先从静态资源绑定中读取，避免递归到同一 Worker 导致 1101
  let sources: any[] = [];
  try {
    const req = new Request(assetsUrl, { headers: { 'cache-control': 'no-cache' } });
    const res = env.ASSETS ? await env.ASSETS.fetch(req) : await fetch(req);
    if (!res.ok) return new Response('[]', { headers: { 'content-type': 'application/json' } });
    sources = await res.json();
  } catch {
    return new Response('[]', { headers: { 'content-type': 'application/json' } });
  }
  const timeline: any[] = [];
  await Promise.all(sources.map(async (src: any) => {
    try {
      const feedUrl = String(src.feed || '').startsWith('http') ? src.feed : `https://${src.feed}`;
      const resp = await fetch(feedUrl, { headers: { 'user-agent': 'friends-cf/1.0' } });
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
      return handleFriends(request, env);
    }
    // fallback to static assets (Pages/Workers Sites binding)
    return env.ASSETS.fetch(request);
  }
};
