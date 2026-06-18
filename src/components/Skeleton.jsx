/** Shimmer bar — raw building block. */
function Bar({ w = 'w-full', h = 'h-3', rounded = 'rounded-md', className = '' }) {
  return <div className={`shimmer ${w} ${h} ${rounded} ${className}`} />;
}

/** Matches the visual shape of PostCard. */
export function PostCardSkeleton() {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-card)',
        padding: '16px 20px',
      }}
    >
      {/* Forum row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="shimmer w-1.5 h-1.5 rounded-full shrink-0" />
        <Bar w="w-24" h="h-2.5" />
        <Bar w="w-12" h="h-2" className="ml-auto" />
      </div>
      {/* Title */}
      <Bar w="w-full" h="h-4" rounded="rounded" className="mb-2" />
      <Bar w="w-4/5" h="h-4" rounded="rounded" className="mb-3" />
      {/* Body lines */}
      <Bar w="w-full" h="h-3" className="mb-1.5" />
      <Bar w="w-3/4" h="h-3" className="mb-4" />
      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <div className="shimmer w-7 h-7 rounded-xl shrink-0" />
          <Bar w="w-20" h="h-2.5" />
        </div>
        <div className="flex gap-4">
          <Bar w="w-8" h="h-2.5" />
          <Bar w="w-8" h="h-2.5" />
          <Bar w="w-8" h="h-2.5" />
        </div>
      </div>
    </div>
  );
}

/** A compact shimmer card for RecentComments rows. */
export function CommentCardSkeleton() {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="shimmer w-7 h-7 rounded-xl shrink-0" />
        <Bar w="w-24" h="h-2.5" />
        <Bar w="w-12" h="h-2" className="ml-auto" />
      </div>
      <Bar w="w-40" h="h-2" className="mb-2.5" />
      <Bar w="w-full" h="h-3" className="mb-1.5" />
      <Bar w="w-2/3" h="h-3" />
    </div>
  );
}

/** Stacked feed of PostCard skeletons for initial page loads. */
export function FeedSkeleton({ count = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}
