'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const slides = [
  {
    icon: '🧠',
    color: '#ff6b35',
    bg: 'rgba(255,107,53,0.12)',
    title: 'AI Plans Your Day',
    desc: 'Just describe your goals in plain language. Routinely\'s AI instantly builds a high-performance routine tailored to you.',
  },
  {
    icon: '⏱️',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)',
    title: 'Stay in Deep Focus',
    desc: 'Block distractions, track your sessions, and get smart break reminders so you can do your best work every day.',
  },
  {
    icon: '📊',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    title: 'Track Your Progress',
    desc: 'Understand where your time goes with beautiful analytics. See your productivity patterns and keep improving.',
  },
];

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const router = useRouter();

  const goNext = () => {
    if (animating) return;
    if (current < slides.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setCurrent(c => c + 1);
        setAnimating(false);
      }, 200);
    } else {
      finish();
    }
  };

  const finish = () => {
    localStorage.setItem('onboarding_done', 'true');
    router.replace('/login');
  };

  const slide = slides[current];

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'env(safe-area-inset-top, 2rem) 1.5rem env(safe-area-inset-bottom, 2rem)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background orb */}
      <div style={{
        position: 'absolute', width: 400, height: 400,
        borderRadius: '50%', background: slide.color,
        opacity: 0.06, filter: 'blur(80px)',
        top: -100, right: -100, transition: 'background 0.4s',
        pointerEvents: 'none',
      }} />

      {/* Skip button */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem' }}>
        <button
          onClick={finish}
          style={{
            background: 'none', border: 'none', color: 'var(--text-3)',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', padding: '0.5rem',
          }}
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', maxWidth: 360,
        opacity: animating ? 0 : 1, transform: animating ? 'translateY(12px)' : 'translateY(0)',
        transition: 'opacity 0.2s, transform 0.2s',
      }}>
        {/* Icon */}
        <div style={{
          width: 100, height: 100, borderRadius: 28,
          background: slide.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '3rem', marginBottom: '2.5rem',
          boxShadow: `0 20px 40px ${slide.bg}`,
        }}>
          {slide.icon}
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.875rem',
          fontWeight: 700, letterSpacing: '-0.025em',
          color: 'var(--text)', marginBottom: '1rem',
        }}>
          {slide.title}
        </h1>
        <p style={{
          fontSize: '1rem', color: 'var(--text-2)',
          lineHeight: 1.7, fontWeight: 400,
        }}>
          {slide.desc}
        </p>
      </div>

      {/* Bottom controls */}
      <div style={{ width: '100%', maxWidth: 360, paddingBottom: '1rem' }}>
        {/* Dot indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: '2rem' }}>
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                height: 8,
                width: i === current ? 28 : 8,
                borderRadius: 99,
                background: i === current ? slide.color : 'var(--border-strong)',
                transition: 'all 0.3s',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* Next / Get Started button */}
        <button
          onClick={goNext}
          style={{
            width: '100%', padding: '1rem',
            borderRadius: 16, border: 'none',
            background: slide.color,
            color: 'white', fontSize: '1rem',
            fontWeight: 700, cursor: 'pointer',
            boxShadow: `0 8px 24px ${slide.bg}`,
            transition: 'all 0.2s',
          }}
        >
          {current === slides.length - 1 ? 'Get Started →' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
