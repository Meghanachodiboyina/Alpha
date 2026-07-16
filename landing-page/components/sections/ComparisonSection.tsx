'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type CardState = 'default' | 'corrected';

export default function ComparisonSection() {
  const [cardState, setCardState] = useState<CardState>('default');

  return (
    <section className="section" style={{ background: 'var(--bg)' }}>
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className="text-center"
          style={{ maxWidth: 680, marginInline: 'auto', marginBottom: '4.5rem' }}
        >
          <p className="caption" style={{ color: 'var(--orange)', letterSpacing: '0.1em', marginBottom: '1rem' }}>THE DIFFERENCE</p>
          <h2 className="h2">
            Most planners organize tasks.
            <br />
            <span style={{ background: 'linear-gradient(130deg, #ff6b35, #ff9f6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Orbit organizes your day.
            </span>
          </h2>
        </motion.div>

        {/* Main comparison grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', maxWidth: 860, marginInline: 'auto', marginBottom: '4rem' }}>
          {/* Traditional Apps */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 24, padding: '2rem' }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Traditional Apps</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-2)' }}>Basic task managers</div>
            </div>
            {[
              'Manual scheduling',
              'Static, rigid plans',
              'Generic AI suggestions',
              'No clarification questions',
              'Ignores real-world constraints',
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>✕</div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{item}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Orbit */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.06 }}
            style={{ background: 'rgba(255,107,53,0.04)', border: '1px solid rgba(255,107,53,0.18)', borderRadius: 24, padding: '2rem', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #ff6b35, #ff9f6b)' }} />
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: 8 }}>Orbit by Routinely</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>Intelligent AI planner</div>
            </div>
            {[
              'AI-powered scheduling',
              'Dynamic, adaptive plans',
              'Context-aware intelligence',
              'Clarification-first approach',
              'Real-world constraint validation',
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: i < 4 ? '1px solid rgba(255,107,53,0.08)' : 'none' }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(255,107,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--orange)', fontWeight: 700, flexShrink: 0 }}>✓</div>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{item}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Intelligence Demo Card */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          style={{ maxWidth: 680, marginInline: 'auto' }}
        >
          <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>ORBIT INTELLIGENCE IN ACTION</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text)' }}>Orbit spots problems before they happen.</h3>
          </div>

          <div
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => setCardState(prev => prev === 'default' ? 'corrected' : 'default')}
          >
            {/* User's original entry */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: '0.75rem' }}>YOU ENTERED</div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🛒</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Buy swimming goggles at Decathlon</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>11:45 PM</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Scheduled time</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Orbit's response */}
            <AnimatePresence mode="wait">
              {cardState === 'default' ? (
                <motion.div
                  key="orbit-resp"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ padding: '1.5rem', background: 'rgba(255,107,53,0.04)' }}
                >
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--orange)', marginBottom: '0.75rem' }}>✦ ORBIT DETECTED</div>
                  <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,107,53,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>✦</div>
                    <div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: '0.875rem' }}>
                        "Decathlon typically closes around 9 PM. Would you like to move this to <strong style={{ color: 'var(--orange)' }}>tomorrow morning</strong> or <strong style={{ color: 'var(--orange)' }}>earlier today</strong>?"
                      </p>
                      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, padding: '6px 14px', borderRadius: 99, background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', color: 'var(--orange)', cursor: 'pointer' }}>Move to tomorrow 10 AM →</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, padding: '6px 14px', borderRadius: 99, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>Fit in today at 6 PM →</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="orbit-fix"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0 }}
                  style={{ padding: '1.5rem', background: 'rgba(34,197,94,0.04)' }}
                >
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#22c55e', marginBottom: '0.75rem' }}>✓ ORBIT FIXED IT</div>
                  <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🛒</div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Buy swimming goggles at Decathlon</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>Tomorrow 10:00 AM</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Within store hours ✓</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.875rem' }}>
            Tap the card to see Orbit's correction →
          </p>
        </motion.div>
      </div>
    </section>
  );
}
