'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────
type Phase =
  | 'home'
  | 'arc'
  | 'orbit-landing'
  | 'orbit-typing'
  | 'orbit-thinking'
  | 'orbit-success';

const USER_PROMPT = 'Plan my day tomorrow — 2h Python study and gym at 6pm';

const THINKING_STEPS = [
  { label: 'Analyzing your tasks', done: false },
  { label: 'Checking time blocks', done: false },
  { label: 'Balancing workload', done: false },
  { label: 'Creating your routine', done: false },
];

// ─── Helpers ─────────────────────────────────────────────────
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Main component ──────────────────────────────────────────
export default function HeroSection({
  onScrollToOrbitSection,
}: {
  onScrollToOrbitSection: () => void;
}) {
  const playStoreUrl =
    'https://play.google.com/store/apps/details?id=com.routinely.app';

  return (
    <section
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        paddingTop: 'clamp(5rem, 12vw, 9rem)',
        paddingBottom: 'clamp(3rem, 6vw, 6rem)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 80% 60% at 60% 40%, rgba(255,107,53,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'clamp(3rem, 8vw, 7rem)',
            alignItems: 'center',
          }}
        >
          {/* ── Left: Copy ── */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.08 }}
          >
            <p
              className="caption"
              style={{
                color: 'var(--orange)',
                letterSpacing: '0.12em',
                marginBottom: '1.5rem',
              }}
            >
              MEET ORBIT
            </p>

            <h1 className="h1" style={{ marginBottom: '1.5rem' }}>
              Your day.
              <br />
              <span
                style={{
                  background: 'linear-gradient(130deg, #ff6b35 0%, #ff9f6b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Planned by Orbit.
              </span>
            </h1>

            <p
              style={{
                fontSize: '1.125rem',
                lineHeight: 1.7,
                color: 'var(--text-2)',
                maxWidth: 440,
                marginBottom: '2.5rem',
              }}
            >
              Describe your tasks in plain language. Orbit asks the right
              questions and creates a realistic schedule that works in real life.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '0.875rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg"
              >
                Download App
              </a>
              <button
                onClick={onScrollToOrbitSection}
                className="btn btn-ghost btn-lg"
                style={{ gap: '0.625rem' }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
                Watch Orbit Build a Day
              </button>
            </div>

            <p
              style={{
                marginTop: '2rem',
                fontSize: '0.8rem',
                color: 'var(--text-3)',
              }}
            >
              Free on Android · No account required
            </p>
          </motion.div>

          {/* ── Right: Exact Phone Demo ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 24,
              delay: 0.12,
            }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Glow behind phone */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 340,
                height: 340,
                background:
                  'radial-gradient(ellipse, rgba(255,107,53,0.18) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <PhoneMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Phone shell ─────────────────────────────────────────────
function PhoneMockup() {
  const [phase, setPhase] = useState<Phase>('home');
  const [arcVisible, setArcVisible] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [thinkingStep, setThinkingStep] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      while (!cancelled) {
        // HOME
        setPhase('home');
        setArcVisible(false);
        setTypedText('');
        setThinkingStep(0);
        await delay(2200);
        if (cancelled) return;

        // ARC opens
        setArcVisible(true);
        setPhase('arc');
        await delay(1200);
        if (cancelled) return;

        // Tap "Orbit" → arc closes, orbit screen opens
        setArcVisible(false);
        setPhase('orbit-landing');
        await delay(1000);
        if (cancelled) return;

        // User types prompt
        setPhase('orbit-typing');
        const prompt = USER_PROMPT;
        for (let i = 1; i <= prompt.length; i++) {
          if (cancelled) return;
          setTypedText(prompt.slice(0, i));
          await delay(30 + Math.random() * 20);
        }
        await delay(500);
        if (cancelled) return;

        // Thinking phases
        setPhase('orbit-thinking');
        for (let i = 0; i < THINKING_STEPS.length; i++) {
          if (cancelled) return;
          setThinkingStep(i);
          await delay(700);
        }
        await delay(400);
        if (cancelled) return;

        // Success
        setPhase('orbit-success');
        await delay(3200);
        if (cancelled) return;
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      style={{
        width: 285,
        height: 618,
        background: '#000',
        borderRadius: 50,
        border: '10px solid #1c1c28',
        overflow: 'hidden',
        boxShadow:
          '0 48px 96px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.05)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Status bar */}
      <StatusBar />

      {/* Screens */}
      <div style={{ position: 'relative', height: 'calc(100% - 38px)' }}>
        <AnimatePresence mode="wait">
          {(phase === 'home' || phase === 'arc') && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <HomeScreen />
              {/* Arc FAB overlay */}
              <ArcMenu visible={phase === 'arc'} />
            </motion.div>
          )}

          {phase === 'orbit-landing' && (
            <motion.div
              key="orbit-land"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <OrbitScreen phase="landing" typed="" thinkingStep={0} />
            </motion.div>
          )}

          {phase === 'orbit-typing' && (
            <motion.div
              key="orbit-type"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <OrbitScreen phase="typing" typed={typedText} thinkingStep={0} />
            </motion.div>
          )}

          {phase === 'orbit-thinking' && (
            <motion.div
              key="orbit-think"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <OrbitScreen
                phase="thinking"
                typed={typedText}
                thinkingStep={thinkingStep}
              />
            </motion.div>
          )}

          {phase === 'orbit-success' && (
            <motion.div
              key="orbit-success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <OrbitScreen phase="success" typed={typedText} thinkingStep={4} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Status bar ──────────────────────────────────────────────
function StatusBar() {
  return (
    <div
      style={{
        height: 38,
        padding: '8px 20px 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#000',
        zIndex: 20,
        position: 'relative',
      }}
    >
      <span style={{ color: 'white', fontSize: 11.5, fontWeight: 700 }}>
        4:35
      </span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {/* Signal */}
        <svg width="14" height="10" viewBox="0 0 14 10" fill="white">
          <rect x="0" y="5" width="2.5" height="5" rx="0.8" opacity="0.4" />
          <rect x="4" y="3" width="2.5" height="7" rx="0.8" opacity="0.6" />
          <rect x="8" y="1" width="2.5" height="9" rx="0.8" opacity="0.8" />
          <rect x="12" y="0" width="2.5" height="10" rx="0.8" />
        </svg>
        {/* Wifi */}
        <svg width="14" height="11" viewBox="0 0 24 18" fill="white">
          <path d="M12 14.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
          <path d="M6.5 10.5C8 8.8 9.9 8 12 8s4 .8 5.5 2.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M2 6.5C5 3.2 8.3 1.5 12 1.5s7 1.7 10 5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
        </svg>
        {/* Battery */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <div
            style={{
              width: 22,
              height: 11,
              border: '1.5px solid rgba(255,255,255,0.55)',
              borderRadius: 3,
              position: 'relative',
              padding: 1.5,
            }}
          >
            <div
              style={{
                width: '80%',
                height: '100%',
                background: '#22c55e',
                borderRadius: 1.5,
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: -4,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 2.5,
                height: 5,
                background: 'rgba(255,255,255,0.4)',
                borderRadius: 1,
              }}
            />
          </div>
          <span style={{ color: '#22c55e', fontSize: 9, fontWeight: 700 }}>
            84
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Home Screen ─────────────────────────────────────────────
function HomeScreen() {
  return (
    <div
      style={{
        height: '100%',
        background: '#0a0a12',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0.75rem 1rem 0.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexShrink: 0,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.7)',
              marginBottom: 2,
            }}
          >
            Good evening,
          </p>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 20,
              color: '#ff6b35',
              lineHeight: 1.1,
              marginBottom: 2,
            }}
          >
            Prakhya
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
            Tuesday, June 9
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            <svg key="s" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>,
            <svg key="b" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>,
          ].map((icon, i) => (
            <div
              key={i}
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: 'rgba(255,255,255,0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable area */}
      <div
        style={{
          flex: 1,
          overflowY: 'hidden',
          padding: '0.5rem 1rem 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {/* Today's Focus card */}
        <div
          style={{
            background: 'linear-gradient(160deg, #1a0f0a, #120a14)',
            borderRadius: 18,
            overflow: 'hidden',
            border: '1px solid rgba(255,107,53,0.18)',
            position: 'relative',
          }}
        >
          {/* orange top line */}
          <div
            style={{
              height: 2.5,
              background: 'linear-gradient(90deg, #ff6b35, #ff9f6b)',
            }}
          />
          <div style={{ padding: '0.75rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: '0.75rem',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  background: 'rgba(255,107,53,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff6b35">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M12 14c-5 0-8 2-8 3v1h16v-1c0-1-3-3-8-3z" />
                </svg>
              </div>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: '0.09em',
                  color: '#ff6b35',
                }}
              >
                TODAY'S FOCUS
              </span>
            </div>
            {/* All clear state */}
            <div style={{ textAlign: 'center', padding: '0.5rem 0 0.25rem' }}>
              <div style={{ marginBottom: 6, fontSize: 28 }}>
                {/* Ribbon icon */}
                <svg width="32" height="36" viewBox="0 0 32 36" fill="none">
                  <ellipse cx="16" cy="12" rx="10" ry="10" stroke="#ff6b35" strokeWidth="2" fill="none" />
                  <path d="M10 20l-4 14 10-6 10 6-4-14" stroke="#ff6b35" strokeWidth="2" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 14,
                  color: 'white',
                  marginBottom: 3,
                }}
              >
                All clear!
              </p>
              <p
                style={{
                  fontSize: 10.5,
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                No pending routines for today.
              </p>
            </div>
          </div>
        </div>

        {/* Productivity card */}
        <div
          style={{
            background: '#111118',
            borderRadius: 18,
            padding: '0.75rem',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 14,
                color: 'white',
              }}
            >
              Productivity
            </span>
            <div
              style={{
                background: '#ff6b35',
                borderRadius: 99,
                padding: '2px 10px',
                fontSize: 9.5,
                fontWeight: 700,
                color: 'white',
              }}
            >
              This Week
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Donut */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                <circle cx="26" cy="26" r="22" fill="none" stroke="#ff6b35" strokeWidth="6" strokeDasharray="138" strokeDashoffset="138" strokeLinecap="round" />
              </svg>
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'white',
                }}
              >
                0%
              </span>
            </div>
            {/* Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
              {[
                { icon: '✓', color: '#22c55e', label: 'Completed', val: 0 },
                { icon: '○', color: '#f59e0b', label: 'Pending', val: 0 },
                { icon: '≡', color: '#6366f1', label: 'Total', val: 0 },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      background: `${s.color}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      color: s.color,
                      fontWeight: 700,
                    }}
                  >
                    {s.icon}
                  </div>
                  <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                    {s.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    {s.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Suggestion card */}
        <div
          style={{
            background: 'linear-gradient(160deg, #0d1025, #0a0f1e)',
            borderRadius: 18,
            padding: '0.75rem',
            border: '1px solid rgba(99,102,241,0.2)',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: 'rgba(99,102,241,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                }}
              >
                ✦
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#818cf8',
                }}
              >
                AI Suggestion
              </span>
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>✕</span>
          </div>
          <p
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.7)',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span>🌙</span>
            Wind down and plan tomorrow — you earned it!
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 99,
              padding: '4px 12px',
              fontSize: 10,
              fontWeight: 700,
              color: '#818cf8',
            }}
          >
            <span>⚡</span> Optimize My Day
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <BottomNav active="home" />
    </div>
  );
}

// ─── Arc menu ────────────────────────────────────────────────
function ArcMenu({ visible }: { visible: boolean }) {
  const options = [
    { label: 'Planner', icon: '📅', angle: -75, dist: 85 },
    { label: 'Orbit', icon: '✦', angle: -90, dist: 110, highlight: true },
    { label: 'Workspace', icon: '💼', angle: -105, dist: 85 },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: 54,
            zIndex: 30,
          }}
        >
          {/* Arc options */}
          {options.map((opt, i) => {
            const rad = (opt.angle * Math.PI) / 180;
            const x = Math.cos(rad) * opt.dist;
            const y = Math.sin(rad) * opt.dist;
            return (
              <motion.div
                key={opt.label}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ opacity: 1, scale: 1, x, y }}
                exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26, delay: i * 0.06 }}
                style={{
                  position: 'absolute',
                  bottom: 54,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: opt.highlight ? 48 : 40,
                    height: opt.highlight ? 48 : 40,
                    borderRadius: '50%',
                    background: opt.highlight
                      ? 'linear-gradient(135deg, #ff6b35, #ff9f6b)'
                      : 'rgba(255,255,255,0.1)',
                    border: opt.highlight
                      ? 'none'
                      : '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: opt.highlight ? 18 : 16,
                    boxShadow: opt.highlight
                      ? '0 0 24px rgba(255,107,53,0.5)'
                      : 'none',
                    color: 'white',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {opt.icon}
                </div>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: opt.highlight ? '#ff9f6b' : 'rgba(255,255,255,0.7)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {opt.label}
                </span>
              </motion.div>
            );
          })}

          {/* FAB (active state) */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1, rotate: 45 }}
            style={{
              position: 'absolute',
              bottom: 54,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6b35, #ff9f6b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: 'white',
              boxShadow: '0 0 32px rgba(255,107,53,0.55), 0 8px 24px rgba(0,0,0,0.4)',
              zIndex: 10,
            }}
          >
            ✦
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Orbit Screen ────────────────────────────────────────────
function OrbitScreen({
  phase,
  typed,
  thinkingStep,
}: {
  phase: 'landing' | 'typing' | 'thinking' | 'success';
  typed: string;
  thinkingStep: number;
}) {
  return (
    <div
      style={{
        height: '100%',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* History icon top right */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 14,
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      </div>

      {/* Center branding — shown on landing, fades up when chat starts */}
      <motion.div
        animate={{
          opacity: phase === 'landing' ? 1 : 0,
          y: phase === 'landing' ? 0 : -20,
        }}
        transition={{ duration: 0.4 }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.15 }}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 32,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
          }}
        >
          Orbit{' '}
          <span style={{ color: '#ff6b35', fontSize: 28 }}>✦</span>
        </motion.div>
        <p
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'center',
            maxWidth: 180,
            lineHeight: 1.5,
          }}
        >
          Your AI planner for a better, balanced day.
        </p>
      </motion.div>

      {/* Chat area (typing / thinking / success) */}
      <AnimatePresence>
        {(phase === 'typing' || phase === 'thinking' || phase === 'success') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              flex: 1,
              padding: '0.75rem 0.875rem 0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              justifyContent: 'flex-end',
              overflowY: 'hidden',
            }}
          >
            {/* User bubble */}
            {typed.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  alignSelf: 'flex-end',
                  background: '#ff6b35',
                  borderRadius: '16px 16px 4px 16px',
                  padding: '9px 12px',
                  fontSize: 11.5,
                  color: 'white',
                  lineHeight: 1.5,
                  maxWidth: '85%',
                  wordBreak: 'break-word',
                }}
              >
                {typed}
                {phase === 'typing' && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 1.5,
                      height: 12,
                      background: 'rgba(255,255,255,0.9)',
                      marginLeft: 2,
                      verticalAlign: 'text-bottom',
                      animation: 'orbitCursorBlink 1s infinite',
                    }}
                  />
                )}
              </motion.div>
            )}

            {/* Thinking panel */}
            {phase === 'thinking' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px 16px 16px 4px',
                  padding: '10px 12px',
                  width: '88%',
                }}
              >
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: '#ff6b35',
                    letterSpacing: '0.08em',
                    marginBottom: 7,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span>✦</span> Orbit is thinking...
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {THINKING_STEPS.map((step, i) => {
                    const isDone = i < thinkingStep;
                    const isActive = i === thinkingStep;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: i <= thinkingStep ? 1 : 0.25, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                        }}
                      >
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: isDone
                              ? 'rgba(34,197,94,0.15)'
                              : isActive
                              ? 'rgba(255,107,53,0.15)'
                              : 'rgba(255,255,255,0.05)',
                            border: `1.5px solid ${isDone ? '#22c55e' : isActive ? '#ff6b35' : 'rgba(255,255,255,0.1)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: 8,
                            color: isDone ? '#22c55e' : '#ff6b35',
                          }}
                        >
                          {isDone ? '✓' : isActive ? (
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                              style={{ display: 'block', fontSize: 9 }}
                            >
                              ◌
                            </motion.span>
                          ) : ''}
                        </div>
                        <span
                          style={{
                            fontSize: 10.5,
                            color: isDone
                              ? 'rgba(255,255,255,0.5)'
                              : isActive
                              ? 'white'
                              : 'rgba(255,255,255,0.25)',
                            fontWeight: isActive ? 600 : 400,
                          }}
                        >
                          {step.label}
                        </span>
                        {isActive && (
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                            {[0, 1, 2].map((j) => (
                              <motion.div
                                key={j}
                                animate={{ y: [0, -3, 0] }}
                                transition={{
                                  repeat: Infinity,
                                  duration: 0.55,
                                  delay: j * 0.12,
                                }}
                                style={{
                                  width: 3,
                                  height: 3,
                                  borderRadius: '50%',
                                  background: '#ff6b35',
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Success message */}
            {phase === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                style={{
                  alignSelf: 'flex-start',
                  width: '90%',
                }}
              >
                {/* Orbit reply bubble */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px 16px 16px 4px',
                    padding: '12px 14px',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: '#ff6b35',
                      letterSpacing: '0.06em',
                      marginBottom: 7,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    ✦ Orbit
                  </div>
                  <p
                    style={{
                      fontSize: 11.5,
                      color: 'rgba(255,255,255,0.85)',
                      lineHeight: 1.55,
                      marginBottom: 10,
                    }}
                  >
                    Your routine is created! ✅ Go and check it in{' '}
                    <span
                      style={{
                        color: '#ff6b35',
                        fontWeight: 700,
                        textDecoration: 'underline',
                        textDecorationStyle: 'dotted',
                      }}
                    >
                      My Routines
                    </span>{' '}
                    page.
                  </p>
                  {/* Quick action */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(255,107,53,0.12)',
                      border: '1px solid rgba(255,107,53,0.3)',
                      borderRadius: 99,
                      padding: '6px 14px',
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#ff9f6b',
                    }}
                  >
                    <span>→</span> View My Routines
                  </motion.div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div
        style={{
          padding: '0.5rem 0.875rem 0.75rem',
          flexShrink: 0,
          background: '#000',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 22,
            padding: '9px 10px 9px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 44,
          }}
        >
          {/* Mic icon */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 10a7 7 0 0014 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="9" y1="22" x2="15" y2="22" />
            </svg>
          </div>
          <span
            style={{
              flex: 1,
              fontSize: 11.5,
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            Tell me what you need to do...
          </span>
          {/* Send / Plan CTA */}
          <div
            style={{
              background: '#ff6b35',
              borderRadius: 16,
              padding: '5px 12px',
              fontSize: 10,
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Plan my day
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <BottomNav active="orbit" />

      <style>{`
        @keyframes orbitCursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Bottom Navigation ────────────────────────────────────────
function BottomNav({ active }: { active: 'home' | 'orbit' }) {
  const items = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: 'planner',
      label: 'Planner',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    { id: 'fab', label: '', icon: null }, // FAB placeholder
    {
      id: 'workspace',
      label: 'Workspace',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        height: 56,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        background: '#000',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {items.map((item) => {
        if (item.id === 'fab') {
          return (
            <div
              key="fab"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ff6b35, #ff9f6b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: 'white',
                  boxShadow: '0 4px 20px rgba(255,107,53,0.45)',
                  marginTop: -20,
                }}
              >
                ✦
              </div>
            </div>
          );
        }
        const isActive = active === item.id;
        return (
          <div
            key={item.id}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              color: isActive ? '#ff6b35' : 'rgba(255,255,255,0.3)',
            }}
          >
            {item.icon}
            {item.label && (
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: isActive ? 700 : 400,
                  letterSpacing: '0.02em',
                }}
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
