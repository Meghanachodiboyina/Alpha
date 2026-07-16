'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SCREENS = [
  {
    id: 'home',
    label: 'Home',
    icon: '⌂',
    src: '/images/dashboard.png',
    headline: 'Your day at a glance.',
    desc: 'See your schedule, tasks, and AI recommendations the moment you open the app.',
  },
  {
    id: 'orbit',
    label: 'Orbit',
    icon: '✦',
    src: '/images/orbit.png',
    headline: 'Talk to Orbit.',
    desc: 'Describe your day in plain language. Orbit builds a realistic schedule in seconds.',
  },
  {
    id: 'create',
    label: 'Routine Builder',
    icon: '＋',
    src: '/images/creation.png',
    headline: 'Build your routines.',
    desc: 'Create, manage and customize routines with fine-grained control.',
  },
];

export default function AppShowcaseSection() {
  const [active, setActive] = useState(0);

  // Auto-cycle every 4 seconds
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % SCREENS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const screen = SCREENS[active];

  return (
    <section className="section" style={{ background: 'var(--bg-2)' }}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className="text-center"
          style={{ maxWidth: 600, marginInline: 'auto', marginBottom: '4rem' }}
        >
          <p className="caption" style={{ color: 'var(--orange)', letterSpacing: '0.1em', marginBottom: '1rem' }}>SEE ROUTINELY IN ACTION</p>
          <h2 className="h2">Everything you need to execute.</h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center', maxWidth: 900, marginInline: 'auto' }}>
          {/* Left: Context */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
              {SCREENS.map((s, i) => (
                <motion.button
                  key={s.id}
                  onClick={() => setActive(i)}
                  whileHover={{ x: 3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  style={{
                    textAlign: 'left',
                    padding: '1rem 1.25rem',
                    borderRadius: 16,
                    border: active === i ? '1px solid rgba(255,107,53,0.25)' : '1px solid transparent',
                    background: active === i ? 'rgba(255,107,53,0.05)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: active === i ? '0.4rem' : 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: active === i ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.04)',
                      border: active === i ? '1px solid rgba(255,107,53,0.25)' : '1px solid rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: active === i ? 'var(--orange)' : 'var(--text-3)',
                      transition: 'all 0.2s',
                    }}>
                      {s.icon}
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: active === i ? 'var(--text)' : 'var(--text-2)', transition: 'color 0.2s' }}>
                      {s.label}
                    </span>
                    {active === i && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)', flexShrink: 0 }} />}
                  </div>
                  {active === i && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.55, paddingLeft: '2.5rem' }}
                    >
                      {s.desc}
                    </motion.p>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Progress */}
            <div style={{ display: 'flex', gap: 6, paddingLeft: '1.25rem' }}>
              {SCREENS.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ width: active === i ? 24 : 6, background: active === i ? 'var(--orange)' : 'rgba(255,255,255,0.15)' }}
                  style={{ height: 4, borderRadius: 99, cursor: 'pointer' }}
                  onClick={() => setActive(i)}
                />
              ))}
            </div>
          </motion.div>

          {/* Right: Phone */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.08 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', position: 'relative' }}
          >
            {/* Ambient glow */}
            <div style={{ position: 'absolute', inset: -50, background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, width: 280, height: 590, background: '#000', borderRadius: 40, border: '8px solid #1a1a24', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
              <AnimatePresence mode="wait">
                <motion.img
                  key={active}
                  src={screen.src}
                  alt={screen.label}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </AnimatePresence>
            </div>

            {/* Caption */}
            <AnimatePresence mode="wait">
              <motion.p
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)', textAlign: 'center', zIndex: 1, position: 'relative' }}
              >
                {screen.headline}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
