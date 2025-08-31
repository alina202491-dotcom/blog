#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SOURCES_FILE = path.join(PUBLIC_DIR, 'friends-sources.json');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'friends.json');

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

function normalizeItem(item, fallbackAuthor) {
  const title = item.title?.['#text'] || item.title || '';
  const link = item.link?.href || item.link?.[0]?.href || item.link || item.guid?.['#text'] || '';
  const author = item['dc:creator'] || item.author?.name || item.author || fallbackAuthor || '';
  const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString();
  const content = item['content:encoded'] || item.description || item.summary || '';
  return {
    title: String(title).trim(),
    auther: String(author).trim(),
    date: new Date(pubDate).toISOString(),
    link: typeof link === 'string' ? link : (link?.[0] || ''),
    content: String(content).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 160)
  };
}

async function fetchFeed({ name, feed }) {
  const res = await fetch(feed, { headers: { 'user-agent': 'friends-aggregator/1.0 (+https://github.com/)' } });
  if (!res.ok) throw new Error(`Fetch ${feed} failed: ${res.status}`);
  const xml = await res.text();
  const json = parser.parse(xml);
  // RSS 2.0
  if (json.rss?.channel) {
    const channel = json.rss.channel;
    const items = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);
    return items
      .map(i => normalizeItem(i, name))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);
  }
  // Atom
  if (json.feed?.entry) {
    const entries = Array.isArray(json.feed.entry) ? json.feed.entry : [json.feed.entry];
    return entries
      .map(i => normalizeItem(i, name))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);
  }
  throw new Error('Unknown feed format');
}

async function main() {
  const sourcesRaw = await fs.readFile(SOURCES_FILE, 'utf8');
  const sources = JSON.parse(sourcesRaw);
  const groups = [];
  for (const src of sources) {
    try {
      const items = await fetchFeed(src);
      const group = {
        name: src.name,
        site: src.site,
        items
      };
      groups.push(group);
    } catch (e) {
      console.error(`[friends] source failed: ${src.name} - ${e.message}`);
    }
  }
  // sort groups by latest item date desc
  groups.sort((a, b) => (new Date(b.items?.[0]?.date).getTime() || 0) - (new Date(a.items?.[0]?.date).getTime() || 0));
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(groups, null, 2), 'utf8');
  console.log(`[friends] wrote ${groups.length} groups to ${path.relative(ROOT, OUTPUT_FILE)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
