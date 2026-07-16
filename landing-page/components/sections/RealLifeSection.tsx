'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CARDS = [
  {
    icon: '🏪',
    title: 'Store Hours Aware',
    preview: 'Decathlon closes at 9 PM',
    detail: 'Orbit automatically checks if scheduled errands align with business hours and reschedules to valid times.',
    color: '#ff6b35',
  },
  {
    icon: '🚗',
    title: 'Travel Time Aware',
    preview: 'Airport is 45 min away',
    detail: 'Orbit accounts for commute durations and inserts appropriate travel buffers before every appointment.',
    color: '#8b5cf6',
  },
  {
    icon: '🔋',
    title: 'Energy-Aware Scheduling',
    preview: 'High-focus work in the morning',
    detail: 'Deep work and cognitively demanding tasks are scheduled during peak energy windows, not late evenings.',
    color: '#3b82f6',
  },
  {
    icon: '☕',
    title: 'Break Insertion',
    preview: 'No 6-hour work blocks',
    detail: 'Orbit prevents burnout by inserting short recovery breaks between long focused sessions automatically.',
    color: '#22c55e',
  },
  {
    icon: '⚠️',
    title: 'Conflict Detection',
    preview: 'Two tasks overlap at 3 PM',
    detail: 'When schedule conflicts arise, Orbit surfaces them clearly and suggests smart resolutions instantly.',
    color: '#f59e0b',
  },
];

export default function RealLifeSection() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section className="section" style={{ background: 'var(--bg)' }}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className="text-center"
          style={{ maxWidth: 600, marginInline: 'auto', marginBottom: '4rem' }}
        >
          <p className="caption" style={{ color: 'var(--orange)', letterSpacing: '0.1em', marginBottom: '1rem' }}>BUILT FOR REAL LIFE</p>
          <h2 className="h2">Schedules that actually work.</h2>
          <p className="body-lg text-muted" style={{ marginTop: '1rem' }}>
            Tap any card to see how Orbit handles it.
          </p>
        </motion.div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', maxWidth: 900, marginInline: 'auto' }}>
          {CARDS.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ type: 'spring', stiffness: 260, damping: 22, delay: i * 0.05 }}
              onClick={() => setActive(active === i ? null : i)}
              whileHover={{ y: -3, borderColor: `${card.color}30` }}
              style={{
                flex: '1 1 240px',
                maxWidth: 340,
                background: active === i ? `${card.color}08` : 'var(--bg-2)',
                border: `1px solid ${active === i ? card.color + '25' : 'var(--border)'}`,
                borderRadius: 20,
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {active === i && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: card.color }} />
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '0.75rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: `${card.color}12`, border: `1px solid ${card.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {card.icon}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 3, lineHeight: 1.3 }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                    e.g. "{card.preview}"
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {active === i && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.6, overflow: 'hidden' }}
                  >
                    {card.detail}
                  </motion.p>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: '0.75rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: card.color, opacity: 0.7 }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600 }}>
                  {active === i ? 'Tap to collapse' : 'Tap to expand'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
