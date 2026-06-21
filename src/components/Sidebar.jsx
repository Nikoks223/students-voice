import { lazy, Suspense } from 'react';

const SidebarContent = lazy(() => import('./SidebarContent'));

function SidebarSkeleton() {
  return (
    <div className="space-y-1 px-2 pt-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="shimmer h-8 rounded-lg" />
      ))}
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto pr-2 pt-3">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarContent />
        </Suspense>
      </div>
    </aside>
  );
}
