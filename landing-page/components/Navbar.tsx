'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('arc_theme') as 'dark' | 'light' | null;
    const t = saved || 'dark';
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);

    setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768);
  }, []);

  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.routinely.app";

  const handleDownloadClick = (e: React.MouseEvent) => {
    if (!isMobile) {
      e.preventDefault();
      const el = document.getElementById("download");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('arc_theme', next);
  }, [theme]);

  const links = [
    { label: 'Features', href: '/#features' },
    { label: 'How it works', href: '/#how' },
    { label: 'About Us', href: '/about' },
    { label: 'Pricing', href: '/pricing' },
  ];

  return (
    <>
      <nav className="navbar">
        {/* Logo */}
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon">
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-svg" style={{ transition: 'transform 0.3s ease' }}>
              <defs>
                <linearGradient id="routinely-grad-nav" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--orange)" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="var(--purple)" />
                </linearGradient>
                <filter id="r-shadow-nav" x="-2" y="-2" width="36" height="36" filterUnits="userSpaceOnUse">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.4" />
                </filter>
              </defs>
              <g filter="url(#r-shadow-nav)">
                {/* Orbit */}
                <path d="M 19.6 2.5 A 14 14 0 1 0 29.5 12.4" fill="none" stroke="url(#routinely-grad-nav)" strokeWidth="2.5" strokeLinecap="round" />
                
                {/* Orbital Dot */}
                <circle cx="25.9" cy="6.1" r="2.8" fill="url(#routinely-grad-nav)" />
                
                {/* Letter R */}
                <path d="M 12 8 L 18 8 A 5.5 5.5 0 0 1 18 19 L 9 19 L 14 24 L 18 24 L 10 16 L 18 16 A 2.5 2.5 0 0 0 18 11 L 9 11 Z" fill="url(#routinely-grad-nav)" />
              </g>
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

          {isMobile ? (
            <a href={playStoreUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm px-6" style={{ borderRadius: 'var(--r-full)' }}>
              Download App
            </a>
          ) : (
            <a href="#download" onClick={handleDownloadClick} className="btn btn-primary btn-sm px-6" style={{ borderRadius: 'var(--r-full)' }}>
              Download App
            </a>
          )}

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
          {isMobile ? (
            <a href={playStoreUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full" style={{ padding: '12px', fontSize: '0.875rem', fontWeight: 600, borderRadius: 'var(--r-md)' }} onClick={() => setOpen(false)}>
              Download App
            </a>
          ) : (
            <a href="#download" className="btn btn-primary w-full" style={{ padding: '12px', fontSize: '0.875rem', fontWeight: 600, borderRadius: 'var(--r-md)' }} onClick={(e) => { handleDownloadClick(e); setOpen(false); }}>
              Download App
            </a>
          )}

        </div>
      </div>
    </>
  );
}
