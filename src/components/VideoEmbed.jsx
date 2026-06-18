/**
 * Renders a YouTube or TikTok embed responsively.
 * provider: 'youtube' | 'tiktok'
 * embedId:  the video ID extracted from the URL
 * url:      original URL (fallback link if provider unknown)
 */
export default function VideoEmbed({ provider, embedId, url }) {
  if (provider === 'youtube') {
    return (
      <div
        style={{
          position: 'relative',
          paddingTop: '56.25%', // 16:9
          borderRadius: 12,
          overflow: 'hidden',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${embedId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title="YouTube video"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </div>
    );
  }

  if (provider === 'tiktok') {
    return (
      <div style={{ maxWidth: 360, width: '100%' }}>
        <div
          style={{
            position: 'relative',
            paddingTop: '177.78%', // 9:16 vertical
            borderRadius: 12,
            overflow: 'hidden',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <iframe
            src={`https://www.tiktok.com/embed/v2/${embedId}`}
            allow="encrypted-media"
            allowFullScreen
            loading="lazy"
            title="TikTok video"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'var(--color-accent)', fontSize: 13, textDecoration: 'underline' }}
    >
      {url}
    </a>
  );
}
