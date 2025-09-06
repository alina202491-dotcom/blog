import { XMLParser } from 'fast-xml-parser';

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

function extractText(value) {
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
      const v = value[k];
      if (typeof v === 'string' && v.trim()) return v;
      if (Array.isArray(v)) {
        const s = v.map(extractText).filter(Boolean).join(' ');
        if (s.trim()) return s;
      }
    }
  }
  return '';
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '');
}

function normalize(item, author) {
  const title = extractText(item.title) || '';
  const link = (item.link && (item.link.href || (item.link[0] && item.link[0].href))) || item.link || (item.guid && item.guid['#text']) || '';
  const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString();
  const rawContent = extractText(item['content:encoded']) || extractText(item.content) || extractText(item.description) || extractText(item.summary) || '';
  return {
    title: String(title).trim(),
    auther: author,
    date: new Date(pubDate).toISOString(),
    link: typeof link === 'string' ? link : (link && link[0]) || '',
    content: stripHtml(rawContent).replace(/\s+/g, ' ').trim().slice(0, 160),
  };
}

export default async function handler(req, res) {
  try {
    const protoHeader = (req.headers['x-forwarded-proto'] || 'https');
    const hostHeader = (req.headers['x-forwarded-host'] || req.headers.host);
    const baseUrl = `${protoHeader}://${hostHeader}`;
    const sourcesUrl = `${baseUrl}/friends-sources.json`;

    const sourcesResp = await fetch(sourcesUrl, { headers: { 'cache-control': 'no-cache' } });
    if (!sourcesResp.ok) {
      res.setHeader('content-type', 'application/json');
      return res.status(200).send('[]');
    }
    const sources = await sourcesResp.json();

    const timeline = [];
    await Promise.all(
      sources.map(async (src) => {
        try {
          const feedUrl = String(src.feed || '').startsWith('http') ? src.feed : `https://${src.feed}`;
          const resp = await fetch(feedUrl, { headers: { 'user-agent': 'friends-vercel/1.0' } });
          if (!resp.ok) throw new Error('feed fail');
          const xml = await resp.text();
          const json = xmlParser.parse(xml);

          if (json.rss && json.rss.channel) {
            const items = Array.isArray(json.rss.channel.item) ? json.rss.channel.item : [json.rss.channel.item].filter(Boolean);
            const picked = items
              .map((i) => {
                const n = normalize(i, src.name);
                const candidates = [];
                const pushMedia = (m) => {
                  if (!m) return;
                  if (Array.isArray(m)) return m.forEach(pushMedia);
                  if (typeof m === 'object') {
                    const maybe = m.url || m.href || m.src || m._;
                    if (typeof maybe === 'string') candidates.push(maybe);
                  }
                  if (typeof m === 'string') candidates.push(m);
                };
                pushMedia(i['media:content']);
                pushMedia(i['media:thumbnail']);
                pushMedia(i.media && i.media.content);
                const enc = i.enclosure;
                if (enc) {
                  if (Array.isArray(enc)) enc.forEach((e) => (((e.type || '') || '').includes('image') && candidates.push(e.url || e.href)));
                  else if (((enc.type || '') || '').includes('image')) candidates.push(enc.url || enc.href);
                }
                const html = extractText(i['content:encoded']) || extractText(i.description) || extractText(i.summary) || '';
                if (typeof html === 'string') {
                  const m = html.match(/<img[^>]+src=["']?([^"'>\s]+)["']?[^>]*>/i);
                  if (m) candidates.push(m[1]);
                }
                const cover = candidates.find((u) => typeof u === 'string' && /^https?:\/\//.test(u)) || '';
                return { ...n, name: src.name, site: src.site, cover };
              })
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 8);
            timeline.push(...picked);
          } else if (json.feed && json.feed.entry) {
            const entries = Array.isArray(json.feed.entry) ? json.feed.entry : [json.feed.entry];
            const picked = entries
              .map((i) => {
                const n = normalize(i, src.name);
                const html = extractText(i['content:encoded']) || extractText(i.content) || extractText(i.summary) || '';
                const match = typeof html === 'string' ? html.match(/<img[^>]+src=["']?([^"'>\s]+)["']?[^>]*>/i) : null;
                const cover = match ? match[1] : '';
                return { ...n, name: src.name, site: src.site, cover };
              })
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 8);
            timeline.push(...picked);
          }
        } catch {
          // ignore individual source errors
        }
      })
    );

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 's-maxage=300, stale-while-revalidate=86400');
    return res.status(200).send(JSON.stringify(timeline));
  } catch {
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-cache');
    return res.status(200).send('[]');
  }
}

