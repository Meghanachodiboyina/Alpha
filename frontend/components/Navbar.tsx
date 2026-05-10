'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('arc_theme') as 'dark' | 'light' | null;
    const t = saved || 'dark';
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('arc_theme', next);
  }, [theme]);

  const links = [
    { label: 'Features', href: '/#features' },
    { label: 'How it works', href: '/#how' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'For Teams', href: '/#teams' },
  ];

  return (
    <>
      <nav className="navbar">
        {/* Logo */}
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3L17 7v6l-7 4-7-4V7l7-4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="10" cy="10" r="2" fill="white"/>
            </svg>
          </div>
          <span className="nav-logo-text">Routinely</span>
        </Link>

        {/* Desktop Links */}
        <div className="nav-links">
          {links.map(l => (
            <Link key={l.label} href={l.href} className="nav-link">{l.label}</Link>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {theme === 'dark' ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <Link href="/login" className="nav-login">Log in</Link>

        </div>

        {/* Mobile Toggle */}
        <button className="nav-mobile-btn" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      <div className={`nav-mobile-menu ${open ? 'open' : ''}`}>
        {links.map(l => (
          <Link key={l.label} href={l.href} className="nav-mobile-link" onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
        <div className="flex flex-col gap-3 nav-mobile-cta">
          <button
            onClick={toggleTheme}
            style={{
              padding: '12px', borderRadius: 12,
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              color: 'var(--text)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: '0.875rem', fontWeight: 600,
            }}
          >
            {theme === 'dark' ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
          </button>
          <Link href="/login" className="btn btn-ghost" onClick={() => setOpen(false)}>Log in</Link>

        </div>
      </div>
    </>
  );
}
