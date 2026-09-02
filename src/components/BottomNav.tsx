'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  const itemColor = (path: string) =>
    pathname === path ? 'var(--accent)' : 'var(--text-muted)';

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--panel)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 50
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          alignItems: 'center',
          height: 64,
          position: 'relative'
        }}
      >
        <Link href="/history" style={{ textDecoration: 'none', textAlign: 'center', color: itemColor('/history') }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l3 2" />
            <path d="M9 2h6" />
          </svg>
          <div style={{ fontSize: 9.5, marginTop: 2 }}>履歴</div>
        </Link>

        <Link
          href="/"
          style={{
            textDecoration: 'none',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: 'translateY(-14px)'
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
              border: '3px solid var(--bg)'
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0B1F33" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 11.5 12 4l8 7.5" />
              <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
              <path d="M10 20v-6h4v6" />
            </svg>
          </div>
          <div style={{ fontSize: 9.5, marginTop: 2, color: pathname === '/' ? 'var(--accent)' : 'var(--text-muted)' }}>
            ホーム
          </div>
        </Link>

        <Link href="/gousei" style={{ textDecoration: 'none', textAlign: 'center', color: itemColor('/gousei') }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 17c2-1 3-6 5-6s2 4 4 4 2-7 4-7 2 5 3 6" />
          </svg>
          <div style={{ fontSize: 9.5, marginTop: 2 }}>合成オッズ</div>
        </Link>

        <Link href="/settings" style={{ textDecoration: 'none', textAlign: 'center', color: itemColor('/settings') }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9c.2.6.7 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
          <div style={{ fontSize: 9.5, marginTop: 2 }}>設定</div>
        </Link>
      </div>
    </nav>
  );
}
