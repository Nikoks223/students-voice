export const handler = async (event) => {
  const url = event.queryStringParameters?.url;

  if (!url || !/^https?:\/\/.+/.test(url)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'invalid url' }),
    };
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SrednoshkolskiGlasBot/1.0)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'fetch failed', url }),
      };
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ title, description, image, url }),
    };
  } catch {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'preview unavailable', url }),
    };
  }
};
