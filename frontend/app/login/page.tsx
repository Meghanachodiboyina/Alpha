'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { setCookie } from 'cookies-next';
import api from '@/lib/api';

export default function LoginPage() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const router = useRouter();

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

  // Redirect if already logged in
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/login', { email, password });
      const { access_token, user } = response.data;
      
      setCookie('auth_token', access_token, { maxAge: 60 * 60 * 24 * 7 });
      localStorage.setItem('user', JSON.stringify(user));
      
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Theme Toggle Button (Global) */}
      <button
        onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        style={{
          position: 'fixed', top: 24, right: 24, zIndex: 100,
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          color: 'var(--text-2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s', boxShadow: 'var(--shadow)',
        }}
      >
        {theme === 'dark' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>

      {/* ─── LEFT: Brand panel ─────────────────────── */}
      <div className="auth-left">
        <div className="orb orb-orange" style={{ width: 400, height: 400, top: -120, right: -120, opacity: 0.1, zIndex: 0 }} />
        <div className="orb orb-purple" style={{ width: 300, height: 300, bottom: -80, left: -80, opacity: 0.08, zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link href="/" className="flex items-center gap-3 mb-16" style={{ display: 'inline-flex' }}>
            <div className="nav-logo-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3L17 7v6l-7 4-7-4V7l7-4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="10" cy="10" r="2" fill="white"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>Routinely</span>
          </Link>

          <div className="pill pill-orange mb-8" style={{ display: 'inline-flex' }}>Secure Access</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3vw, 2.75rem)',
            fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: '1.25rem'
          }}>
            Welcome back.<br />
            <span style={{ color: 'var(--orange)' }}>Time to focus.</span>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '3rem' }}>
            Log in to your workspace and pick up exactly where you left off.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { icon: '🧠', text: 'AI builds your daily routine automatically' },
              { icon: '🎯', text: 'Focus sessions with distraction blocking' },
              { icon: '📊', text: 'Track your productivity trends over time' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'var(--orange-light)', border: '1px solid rgba(255,107,53,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
                  flexShrink: 0,
                }}>{item.icon}</div>
                <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-2)' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RIGHT: Login form ──────────────────────── */}
      <div className="auth-right">
        <div className="auth-form-box anim-fade-up">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
            <div className="nav-logo-icon" style={{ display: 'flex' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3L17 7v6l-7 4-7-4V7l7-4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="10" cy="10" r="2" fill="white"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700 }}>Routinely</span>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>
            Log in to Routinely
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-2)', marginBottom: '2.5rem' }}>
            Don't have an account? <Link href="/register" style={{ color: 'var(--orange)', fontWeight: 600 }}>Sign up free</Link>
          </p>

          {error && (
            <div style={{
              marginBottom: '1.5rem', padding: '0.875rem', borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444', fontSize: '0.875rem', fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="field-wrap">
              <label className="field-label">Email address</label>
              <input
                type="email" className="field" placeholder="name@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required
              />
            </div>

            <div className="field-wrap">
              <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                <label className="field-label" style={{ margin: 0 }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--orange)' }}>Forgot password?</Link>
              </div>
              <div className="field-icon-right">
                <input
                  type={show ? 'text' : 'password'} className="field" placeholder="••••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required
                />
                <button type="button" className="field-action" onClick={() => setShow(!show)}>
                  {show ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
              style={{ padding: '1.0625rem', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Authenticating...' : 'Log in to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
