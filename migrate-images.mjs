import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const env = Object.fromEntries(
  readFileSync(new URL('./.cloudinary.env', import.meta.url), 'utf8')
    .split('\n').filter(Boolean).map(l => l.split('='))
);
const CLOUD = env.CLOUDINARY_CLOUD_NAME;
const KEY = env.CLOUDINARY_API_KEY;
const SECRET = env.CLOUDINARY_API_SECRET;
const FOLDER = env.CLOUDINARY_FOLDER || 'FGA';

const ROOT = new URL('./', import.meta.url).pathname;

function discoverBaseUrls() {
  const files = readdirSync(ROOT).filter(f => f.endsWith('.html'));
  const set = new Set();
  for (const f of files) {
    const html = readFileSync(join(ROOT, f), 'utf8');
    for (const m of html.matchAll(/https:\/\/images\.squarespace-cdn\.com\/[^"' )]+\.(?:jpg|jpeg|png|gif|webp|avif|svg|ico)/gi)) {
      set.add(m[0]);
    }
  }
  return [...set].sort();
}

function publicIdFor(url) {
  const filename = decodeURIComponent(url.split('/').pop());
  const stem = filename.replace(/\.[^.]+$/, '');
  return stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function sign(params) {
  const toSign = Object.keys(params).sort()
    .map(k => `${k}=${params[k]}`).join('&');
  return createHash('sha1').update(toSign + SECRET).digest('hex');
}

async function uploadOne(srcUrl) {
  const fetchUrl = srcUrl + (srcUrl.includes('?') ? '' : '?format=2500w');
  const public_id = publicIdFor(srcUrl);
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { folder: FOLDER, overwrite: 'true', public_id, timestamp };
  const signature = sign(signed);

  const form = new FormData();
  form.append('file', fetchUrl);
  form.append('api_key', KEY);
  form.append('timestamp', String(timestamp));
  form.append('public_id', public_id);
  form.append('folder', FOLDER);
  form.append('overwrite', 'true');
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Upload failed for ${srcUrl}: ${JSON.stringify(json.error || json)}`);
  }
  return { srcUrl, public_id: json.public_id, secure_url: json.secure_url, format: json.format, width: json.width, height: json.height };
}

const urls = discoverBaseUrls();
console.log(`Found ${urls.length} unique Squarespace assets.`);

const mapping = [];
for (let i = 0; i < urls.length; i++) {
  const u = urls[i];
  process.stdout.write(`[${i+1}/${urls.length}] ${u.split('/').pop().slice(0, 60)} ... `);
  try {
    const r = await uploadOne(u);
    mapping.push(r);
    console.log(`-> ${r.public_id}`);
  } catch (e) {
    console.log(`FAIL ${e.message}`);
    mapping.push({ srcUrl: u, error: e.message });
  }
}

writeFileSync(join(ROOT, 'url-mapping.json'), JSON.stringify(mapping, null, 2));
console.log(`\nWrote url-mapping.json with ${mapping.length} entries.`);
