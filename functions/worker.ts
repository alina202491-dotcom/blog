import { XMLParser } from 'fast-xml-parser';

export interface Env {
  ASSETS: Fetcher; // pages assets or r2 bucket binding depending on deploy target
}

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

// Robust text extraction utility to avoid "[object Object]" in fields
function extractText(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(extractText).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    const candidates = [value['#text'], value['$t'], value._, value.text, value.value, value.cdata, value['__cdata']];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) return c;
    }
    for (const k of Object.keys(value)) {
      const v = (value as any)[k];
      if (typeof v === 'string' && v.trim()) return v;
      if (Array.isArray(v)) {
        const s = v.map(extractText).filter(Boolean).join(' ');
        if (s.trim()) return s;
      }
    }
  }
  return '';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

function normalize(item: any, author: string) {
  const title = extractText(item.title) || '';
  const link = item.link?.href || item.link?.[0]?.href || item.link || item.guid?.['#text'] || '';
  const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString();
  const rawContent = extractText(item['content:encoded']) || extractText(item.content) || extractText(item.description) || extractText(item.summary) || '';
  return {
    title: String(title).trim(),
    auther: author,
    date: new Date(pubDate).toISOString(),
    link: typeof link === 'string' ? link : (link?.[0] || ''),
    content: stripHtml(String(rawContent)).replace(/\s+/g, ' ').trim().slice(0, 160)
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
          .map((i: any) => {
            const n = normalize(i, src.name);
            const cover = (() => {
              const candidates: string[] = [];
              const pushMedia = (m: any) => {
                if (!m) return;
                if (Array.isArray(m)) return m.forEach(pushMedia);
                if (typeof m === 'object') {
                  const maybe = (m as any).url || (m as any).href || (m as any).src || (m as any)._;
                  if (typeof maybe === 'string') candidates.push(maybe);
                }
                if (typeof m === 'string') candidates.push(m);
              };
              pushMedia((i as any)['media:content']);
              pushMedia((i as any)['media:thumbnail']);
              pushMedia((i as any).media?.content);
              const enc = (i as any).enclosure;
              if (enc) {
                if (Array.isArray(enc)) enc.forEach((e: any) => (((e.type || '') as string).includes('image') && candidates.push((e as any).url || (e as any).href)));
                else if (((enc.type || '') as string).includes('image')) candidates.push((enc as any).url || (enc as any).href);
              }
              const html = extractText((i as any)['content:encoded']) || extractText((i as any).description) || extractText((i as any).summary) || '';
              if (typeof html === 'string') {
                const m = html.match(/<img[^>]+src=["']?([^"'>\s]+)["']?[^>]*>/i);
                if (m) candidates.push(m[1]);
              }
              return candidates.find((u) => typeof u === 'string' && /^https?:\/\//.test(u)) || '';
            })();
            return { ...n, name: src.name, site: src.site, cover };
          })
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 8);
        timeline.push(...picked);
      } else if (json.feed?.entry) {
        const entries = Array.isArray(json.feed.entry) ? json.feed.entry : [json.feed.entry];
        const picked = entries
          .map((i: any) => {
            const n = normalize(i, src.name);
            const html = extractText((i as any)['content:encoded']) || extractText((i as any).content) || extractText((i as any).summary) || '';
            const match = typeof html === 'string' ? html.match(/<img[^>]+src=["']?([^"'>\s]+)["']?[^>]*>/i) : null;
            const cover = match ? match[1] : '';
            return { ...n, name: src.name, site: src.site, cover };
          })
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 8);
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
