'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1800);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="orb orb-orange" style={{ width: 500, height: 500, top: '10%', left: '50%', transform: 'translateX(-50%)', opacity: 0.07 }} />

      <Link href="/" className="flex items-center gap-3" style={{ display: 'inline-flex', marginBottom: '3rem' }}>
        <div className="nav-logo-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3L17 7v6l-7 4-7-4V7l7-4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <circle cx="10" cy="10" r="2" fill="white"/>
          </svg>
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--text)' }}>Routinely</span>
      </Link>

      <div className="card anim-scale-in" style={{
        width: '100%', maxWidth: 480, padding: 'clamp(2rem,6vw,3rem)',
        border: '1px solid var(--border-strong)',
        position: 'relative', zIndex: 1,
      }}>
        {!sent ? (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: 18, background: 'var(--orange-light)',
              border: '1px solid rgba(255,107,53,0.2)', marginBottom: '1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.75" strokeLinecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.75rem' }}>
              Reset your password
            </h1>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '2rem' }}>
              No worries! Enter your email and we'll send you an OTP to reset your password securely.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="field-wrap">
                <label className="field-label">Email address</label>
                <input
                  type="email" className="field" placeholder="name@company.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="btn btn-primary w-full"
                style={{ padding: '1.0625rem', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Sending OTP...' : 'Send reset OTP'}
              </button>
            </form>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link href="/login" className="flex items-center justify-center gap-2" style={{ fontSize: '0.875rem', color: 'var(--text-3)', display: 'inline-flex' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M10 3L5 8l5 5"/>
                </svg>
                Back to login
              </Link>
            </div>
          </>
        ) : (
          <div className="anim-scale-in" style={{ textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20, background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)', marginBottom: '1.5rem', marginInline: 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.75rem' }}>
              Check your email
            </h1>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '2rem' }}>
              We've sent an OTP to <strong style={{ color: 'var(--text)' }}>{email}</strong>. Check your inbox and enter the code to continue.
            </p>
            <Link href="/login" className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '1.0625rem' }}>
              Back to login
            </Link>
            <button type="button" onClick={() => setSent(false)} style={{ display: 'block', marginTop: '1rem', marginInline: 'auto', fontSize: '0.875rem', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Didn't receive it? Resend
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
