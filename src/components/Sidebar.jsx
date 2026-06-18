import SidebarContent from './SidebarContent';

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto pr-2 pt-3">
        <SidebarContent />
      </div>
    </aside>
  );
}
