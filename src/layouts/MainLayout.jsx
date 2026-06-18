import { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileSidebar from '../components/MobileSidebar';
import Footer from '../components/Footer';

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="bg-bg relative flex flex-col" style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      {/* ── Fixed background atmosphere (pointer-events: none — never on scroll containers) ── */}

      {/* Accent smear — top-right, electric blue, very faint */}
      <div
        style={{
          position: 'fixed',
          top: '-10%',
          right: '-5%',
          width: '55vw',
          height: '55vw',
          maxWidth: 700,
          maxHeight: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,92,255,0.055) 0%, transparent 65%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Accent smear — bottom-left, cooler zinc tone */}
      <div
        style={{
          position: 'fixed',
          bottom: '-15%',
          left: '-8%',
          width: '45vw',
          height: '45vw',
          maxWidth: 560,
          maxHeight: 560,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,92,255,0.028) 0%, transparent 65%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Vignette — darkens edges, focuses eye on the center content */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--vignette)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── App chrome ── */}
      <div style={{ position: 'relative', zIndex: 1 }} className="flex flex-col flex-1">
        <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 flex gap-5 pt-5 w-full flex-1">
          <Sidebar />
          <main className="flex-1 min-w-0 pb-28 lg:pb-16">{children}</main>
        </div>
        <Footer />
      </div>
    </div>
  );
}
