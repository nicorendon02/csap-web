const fs = require('fs/promises');
const path = require('path');

const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UC1bKiJRsznnA_CL2gFPAwkg';
const DEFAULT_MAX_RESULTS = 6;
const parsedMaxResults = Number.parseInt(process.env.YOUTUBE_MAX_RESULTS || String(DEFAULT_MAX_RESULTS), 10);
const MAX_RESULTS = Number.isFinite(parsedMaxResults) && parsedMaxResults > 0
  ? Math.min(parsedMaxResults, 50)
  : DEFAULT_MAX_RESULTS;
const OUTPUT_FILE = process.env.YOUTUBE_OUTPUT_FILE || 'data/youtube-videos.json';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(CHANNEL_ID)}`;

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#13;/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .trim();
}

function getTag(xml, tagName) {
  const pattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`);
  const match = xml.match(pattern);
  return match ? decodeXml(match[1]) : '';
}

function formatMonthYear(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function parseEpisode(title) {
  const match = title.match(/\bEpisodio\s+(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function parseFeed(xml) {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return entries
    .map(entry => {
      const id = getTag(entry, 'yt:videoId');
      const title = getTag(entry, 'title');
      const published = getTag(entry, 'published');
      const episode = parseEpisode(title);
      const video = {
        id,
        title,
        date: formatMonthYear(published),
      };
      if (episode) video.episode = episode;
      return video;
    })
    .filter(video => /^[a-zA-Z0-9_-]{6,}$/.test(video.id) && video.title)
    .slice(0, MAX_RESULTS);
}

async function main() {
  const response = await fetch(FEED_URL, {
    headers: { 'user-agent': 'csap-web-youtube-updater' },
  });

  if (!response.ok) {
    throw new Error(`YouTube RSS request failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const videos = parseFeed(xml);

  if (!videos.length) {
    throw new Error('YouTube RSS feed did not include any parseable videos');
  }

  const outputPath = path.resolve(process.cwd(), OUTPUT_FILE);
  const json = JSON.stringify({ videos }, null, 2)
    .replace(/[\u007f-\uffff]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${json}\n`);
  console.log(`Updated ${OUTPUT_FILE} with ${videos.length} YouTube videos from ${CHANNEL_ID}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
