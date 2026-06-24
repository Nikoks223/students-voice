import dns from 'node:dns/promises';
import net from 'node:net';

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
});

// Reject IPs that point at the local host, the private network, or the
// cloud metadata endpoint — the building blocks of SSRF attacks.
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true;
    if (a === 127) return true; // loopback
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true; // loopback / unspecified
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local
    if (lower.startsWith('fe80')) return true; // link-local
    if (lower.startsWith('::ffff:')) return isPrivateIp(lower.slice(7)); // IPv4-mapped
    return false;
  }
  return true; // not a recognisable IP — be conservative
}

// Resolve the host and ensure none of its addresses are internal.
async function assertPublicHost(hostname) {
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.local')) {
    throw new Error('blocked host');
  }
  // If it's already an IP literal, check it directly; otherwise resolve DNS.
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('blocked ip');
    return;
  }
  const records = await dns.lookup(hostname, { all: true });
  if (!records.length || records.some((r) => isPrivateIp(r.address))) {
    throw new Error('blocked resolved ip');
  }
}

// Follow redirects manually so every hop is re-validated against the
// SSRF block-list (a public URL can 302 to an internal one).
async function safeFetch(startUrl) {
  let current = startUrl;
  for (let hop = 0; hop < 5; hop++) {
    const parsed = new URL(current);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('bad protocol');
    }
    await assertPublicHost(parsed.hostname);

    const response = await fetch(current, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SrednoshkolskiGlasBot/1.0)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(6000),
      redirect: 'manual',
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return response;
      current = new URL(location, current).href; // resolve relative redirects
      continue;
    }
    return response;
  }
  throw new Error('too many redirects');
}

export const handler = async (event) => {
  const url = event.queryStringParameters?.url;

  if (!url || !/^https?:\/\/.+/.test(url)) {
    return json(400, { error: 'invalid url' });
  }

  try {
    const response = await safeFetch(url);

    if (!response.ok) {
      return json(200, { error: 'fetch failed', url });
    }

    const html = await response.text();

    const getMeta = (...names) => {
      for (const name of names) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const m =
          html.match(
            new RegExp(
              `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"'<>]{1,500})["']`,
              'i',
            ),
          ) ||
          html.match(
            new RegExp(
              `<meta[^>]+content=["']([^"'<>]{1,500})["'][^>]+(?:property|name)=["']${escaped}["']`,
              'i',
            ),
          );
        if (m?.[1]) return m[1].trim();
      }
      return null;
    };

    const title =
      getMeta('og:title', 'twitter:title') ||
      html.match(/<title[^>]*>([^<]{1,300})<\/title>/i)?.[1]?.trim() ||
      null;
    const description = getMeta('og:description', 'twitter:description', 'description');
    const image = getMeta('og:image', 'twitter:image');

    return json(200, { title, description, image, url });
  } catch {
    return json(200, { error: 'preview unavailable', url });
  }
};
