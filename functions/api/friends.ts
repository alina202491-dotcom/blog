// Cloudflare Pages Function (ESM)
import { XMLParser } from 'fast-xml-parser';

export const onRequestGet: PagesFunction = async (context) => {
  const sourcesUrl = new URL('/friends-sources.json', context.request.url).toString();
  try {
    const res = await fetch(sourcesUrl, { headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) throw new Error('no sources');
    const sources = await res.json();

    const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

    const extractCover = (item: any, contentHtml: string): string => {
      const candidates: string[] = [];
      const pushMedia = (m: any) => {
        if (!m) return;
        if (Array.isArray(m)) return m.forEach(pushMedia);
        if (typeof m === 'object') {
          const maybe = m.url || m.href || m.src || m._;
          if (typeof maybe === 'string') candidates.push(maybe);
        }
        if (typeof m === 'string') candidates.push(m);
      };
      pushMedia(item['media:content']);
      pushMedia(item['media:thumbnail']);
      pushMedia(item.media?.content);
      const enc = item.enclosure;
      if (enc) {
        if (Array.isArray(enc)) enc.forEach((e: any) => ((e.type || '').includes('image') && candidates.push(e.url || e.href)));
        else if ((enc.type || '').includes('image')) candidates.push(enc.url || enc.href);
      }
      const html = item['content:encoded'] || contentHtml || item.description || item.summary || '';
      if (typeof html === 'string') {
        const m = html.match(/<img[^>]+src=["']?([^"'>\s]+)["']?[^>]*>/i);
        if (m) candidates.push(m[1]);
      }
      const cover = candidates.find((u) => typeof u === 'string' && /^https?:\/\//.test(u));
      return cover || '';
    };

    const normalize = (item: any, author: string) => {
      const title = item.title?.['#text'] || item.title || '';
      const link = item.link?.href || item.link?.[0]?.href || item.link || item.guid?.['#text'] || '';
      const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString();
      const content = item['content:encoded'] || item.description || item.summary || '';
      return {
        title: String(title).trim(),
        auther: author,
        date: new Date(pubDate).toISOString(),
        link: typeof link === 'string' ? link : (link?.[0] || ''),
        content: String(content).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 160),
        cover: extractCover(item, content)
      };
    };

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
      } catch (e) {
        console.log('source error', src.name, e);
      }
    }));

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return new Response(JSON.stringify(timeline), { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=300' } });
  } catch (e) {
    // fallback to static json -> flatten to timeline
    try {
      const url = new URL('/friends.json', context.request.url).toString();
      const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
      const groups = await res.json();
      let timeline: any[] = [];
      if (Array.isArray(groups)) {
        timeline = groups.flatMap((g: any) => (g.items || []).map((i: any) => ({ ...i, name: g.name, site: g.site })));
      }
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return new Response(JSON.stringify(timeline), { headers: { 'content-type': 'application/json', 'cache-control': 'no-cache' } });
    } catch (err) {
      return new Response(JSON.stringify([]), { headers: { 'content-type': 'application/json', 'cache-control': 'no-cache' } });
    }
  }
};
