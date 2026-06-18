import SidebarContent from './SidebarContent';
import Button from './ui/Button';

export default function MobileSidebar({ open, onClose }) {
  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          role="presentation"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-72 bg-surface z-50 flex flex-col border-r border-border shadow-pop transform transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Средношколски Глас" className="h-7 w-auto" />
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Затвори мени">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>

        {/* Scrollable nav */}
        <div className="flex-1 overflow-y-auto px-2 pt-3">
          <SidebarContent onLinkClick={onClose} />
        </div>
      </div>
    </>
  );
}
