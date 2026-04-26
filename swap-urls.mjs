import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('./', import.meta.url).pathname;
const env = Object.fromEntries(
  readFileSync(new URL('./.cloudinary.env', import.meta.url), 'utf8')
    .split('\n').filter(Boolean).map(l => l.split('='))
);
const CLOUD = env.CLOUDINARY_CLOUD_NAME;
const FOLDER = env.CLOUDINARY_FOLDER || 'FGA';
const mapping = JSON.parse(readFileSync(join(ROOT, 'url-mapping.json'), 'utf8'));

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function buildCloudUrl(public_id, isFavicon, width) {
  if (isFavicon) {
    return `https://res.cloudinary.com/${CLOUD}/image/upload/${public_id}.ico`;
  }
  const tx = width
    ? `f_auto,q_auto,w_${width}`
    : `f_auto,q_auto`;
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${tx}/${public_id}`;
}

const files = readdirSync(ROOT).filter(f => f.endsWith('.html'));
let totalReplacements = 0;
const perFile = {};

for (const f of files) {
  const path = join(ROOT, f);
  let html = readFileSync(path, 'utf8');
  let count = 0;

  for (const entry of mapping) {
    if (entry.error) continue;
    const isFavicon = entry.srcUrl.endsWith('.ico');
    const escaped = escapeRegex(entry.srcUrl);
    // Match srcUrl with optional ?format=NNNw suffix
    const re = new RegExp(`${escaped}(\\?format=(\\d+)w)?`, 'g');
    html = html.replace(re, (_match, _q, widthStr) => {
      count++;
      const width = widthStr ? parseInt(widthStr, 10) : null;
      return buildCloudUrl(entry.public_id, isFavicon, width);
    });
  }

  if (count > 0) {
    writeFileSync(path, html);
    perFile[f] = count;
    totalReplacements += count;
  }
}

console.log('Replacements per file:');
for (const [f, c] of Object.entries(perFile)) console.log(`  ${f}: ${c}`);
console.log(`\nTotal: ${totalReplacements} URL replacements across ${Object.keys(perFile).length} files.`);
