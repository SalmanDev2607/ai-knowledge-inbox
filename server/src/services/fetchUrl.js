import dns from 'node:dns/promises';
import net from 'node:net';
import * as cheerio from 'cheerio';
import { config } from '../config.js';
import { AppError } from '../errors.js';

const MAX_REDIRECTS = 3;

export function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      a >= 224 // multicast and reserved
    );
  }
  if (net.isIPv6(ip)) {
    const v6 = ip.toLowerCase();
    if (v6 === '::' || v6 === '::1') return true;
    if (v6.startsWith('::ffff:')) {
      const v4 = v6.slice(7);
      return net.isIPv4(v4) ? isPrivateAddress(v4) : true; // hex-form mapped addresses: block
    }
    return /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6); // unique-local and link-local
  }
  return true;
}

async function assertPublicHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  let addresses;
  if (net.isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await dns.lookup(host, { all: true })).map((a) => a.address);
    } catch {
      throw new AppError(422, 'URL_UNRESOLVABLE', `Could not resolve host "${host}"`);
    }
  }
  if (addresses.some(isPrivateAddress)) {
    throw new AppError(422, 'URL_BLOCKED', 'URLs that point to private or internal addresses are not allowed');
  }
}

async function readCapped(res, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of res.body) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new AppError(422, 'CONTENT_TOO_LARGE', `Page is larger than ${maxBytes / 1024 / 1024} MB`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function extractReadableText(html) {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, nav, footer, header, aside, form, iframe').remove();
  const title = $('title').first().text().trim() || $('h1').first().text().trim() || null;

  const root = ['article', 'main', 'body'].map((s) => $(s).first()).find((el) => el.length) ?? $.root();
  const blocks = root
    .find('h1, h2, h3, h4, h5, h6, p, li, pre, blockquote')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(Boolean);

  const text = blocks.length ? blocks.join('\n\n') : root.text().replace(/\s+/g, ' ').trim();
  return { title, text };
}

/** Fetch a public web page and return { title, text }. Every redirect hop is re-validated. */
export async function fetchPage(url) {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(current);
    if (!/^https?:$/.test(parsed.protocol)) throw new AppError(422, 'URL_BLOCKED', 'Only http(s) URLs are allowed');
    await assertPublicHost(parsed.hostname);

    let res;
    try {
      res = await fetch(parsed, {
        redirect: 'manual',
        signal: AbortSignal.timeout(config.fetchTimeoutMs),
        headers: { 'user-agent': 'ai-knowledge-inbox/1.0', accept: 'text/html,text/plain;q=0.9' },
      });
    } catch (err) {
      const reason = err.name === 'TimeoutError' ? 'request timed out' : err.cause?.code || err.message;
      throw new AppError(502, 'FETCH_FAILED', `Could not fetch the URL: ${reason}`);
    }

    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, parsed).toString();
      continue;
    }
    if (!res.ok) throw new AppError(502, 'FETCH_FAILED', `The URL responded with HTTP ${res.status}`);

    const type = res.headers.get('content-type') || '';
    if (!/text\/html|text\/plain|application\/xhtml/.test(type)) {
      throw new AppError(422, 'UNSUPPORTED_CONTENT_TYPE', `Unsupported content type: ${type || 'unknown'}`);
    }
    const body = await readCapped(res, config.maxFetchBytes);
    return type.includes('text/plain') ? { title: null, text: body } : extractReadableText(body);
  }
  throw new AppError(502, 'FETCH_FAILED', 'Too many redirects');
}
