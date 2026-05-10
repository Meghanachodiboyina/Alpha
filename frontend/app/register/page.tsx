'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function RegisterPage() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setSuccess('');

    try {
      await api.post('/register', {
        name: `${firstName} ${lastName}`.trim(),
        email,
        password
      });
      setSuccess('Registration successful! Please login to continue.');
      setTimeout(() => router.replace('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
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
        <div className="orb orb-purple" style={{ width: 450, height: 450, top: -150, left: -100, opacity: 0.08, zIndex: 0 }} />
        <div className="orb orb-orange" style={{ width: 300, height: 300, bottom: -60, right: -60, opacity: 0.08, zIndex: 0 }} />

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

          <div className="pill pill-purple mb-8" style={{ display: 'inline-flex' }}>Early Access Beta</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3vw, 2.75rem)',
            fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: '1.25rem'
          }}>
            Experience the future<br />
            <span style={{ color: 'var(--orange)' }}>of daily planning.</span>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '3rem' }}>
            Start your journey with Routinely and discover what focused productivity feels like. No complex setup required.
          </p>

          {/* Plan summary */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '1.75rem', marginBottom: '2rem',
          }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
              What you'll get
            </div>
            {[
              'AI routine generation',
              'Focus Mode with time tracking',
              'Personal workspace',
              'Productivity analytics',
              'Voice task input',
              'Community support',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3" style={{ marginBottom: '0.875rem' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', background: 'var(--orange-light)',
                  border: '1px solid rgba(255,107,53,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>Join the first wave of planners</p>
        </div>
      </div>

      {/* ─── RIGHT: Register form ───────────────────── */}
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
            Create your account
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-2)', marginBottom: '2.5rem' }}>
            Already have an account? <Link href="/login" style={{ color: 'var(--orange)', fontWeight: 600 }}>Log in</Link>
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

          {success && (
            <div style={{
              marginBottom: '1.5rem', padding: '0.875rem', borderRadius: '12px',
              background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)',
              color: '#22c55e', fontSize: '0.875rem', fontWeight: 500
            }}>
              {success}
            </div>
          )}

          {/* Google OAuth */}
          <button type="button" className="btn btn-ghost w-full" style={{ marginBottom: '0.875rem', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </button>

          <button type="button" className="btn btn-ghost w-full" style={{ marginBottom: '1.5rem', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Sign up with GitHub
          </button>

          <div className="divider mb-6"><span>or with your email</span></div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="field-wrap">
                <label className="field-label">First name</label>
                <input type="text" className="field" placeholder="Alex" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div className="field-wrap">
                <label className="field-label">Last name</label>
                <input type="text" className="field" placeholder="Morgan" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>

            <div className="field-wrap">
              <label className="field-label">Work email</label>
              <input type="email" className="field" placeholder="alex@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="field-wrap">
              <label className="field-label">Password</label>
              <div className="field-icon-right">
                <input
                  type={show ? 'text' : 'password'} className="field"
                  placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required
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

            {/* Password strength indicator */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '-0.75rem' }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ height: 3, flex: 1, borderRadius: 99, background: i <= 2 ? 'var(--orange)' : 'var(--border)' }} />
              ))}
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>Good</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
              style={{ padding: '1.0625rem', marginTop: '0.25rem', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Creating your account...' : 'Create free account →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
              By signing up, you agree to our{' '}
              <Link href="/terms" style={{ color: 'var(--text-2)' }}>Terms of Service</Link> and{' '}
              <Link href="/privacy" style={{ color: 'var(--text-2)' }}>Privacy Policy</Link>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
