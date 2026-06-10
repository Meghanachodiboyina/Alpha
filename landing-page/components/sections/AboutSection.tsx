'use client';
import { motion } from 'framer-motion';

export default function AboutSection() {
  return (
    <section className="section" style={{ background: 'var(--bg-2)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'clamp(3rem, 8vw, 7rem)', alignItems: 'center', maxWidth: 1000, marginInline: 'auto' }}>
          {/* Left: Narrative */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          >
            <p className="caption" style={{ color: 'var(--orange)', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>WHY WE BUILT ORBIT</p>
            <h2 className="h2" style={{ marginBottom: '1.75rem', lineHeight: 1.12 }}>
              Most planning apps expect you to think like a{' '}
              <span style={{ color: 'var(--text-3)' }}>project manager.</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[
                'Life doesn\'t work that way. People think naturally — "I need to study today, hit the gym, and grab groceries" — not in sprints and ticket systems.',
                'We built Orbit to bridge that gap. To turn everyday thoughts into realistic, executable schedules through conversation and intelligence.',
                'The best schedule is the one you\'ll actually follow — not the one that looks good on paper.',
              ].map((para, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.08 }}
                  style={{ fontSize: '1rem', lineHeight: 1.75, color: i === 2 ? 'var(--text)' : 'var(--text-2)', fontWeight: i === 2 ? 500 : 400, fontStyle: i === 2 ? 'italic' : 'normal' }}
                >
                  {i === 2 ? `"${para}"` : para}
                </motion.p>
              ))}
            </div>

            {/* Founder credit */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginTop: '2rem', padding: '1rem 1.25rem', background: 'rgba(255,107,53,0.05)', border: '1px solid rgba(255,107,53,0.15)', borderRadius: 16 }}
            >
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b35, #ff9f6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 }}>P</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>Prakhyath Sai Ponduru</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>AI Product Engineer · AI Systems, Product Design, UX</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Phone with Orbit */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.08 }}
            style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}
          >
            <div style={{ position: 'absolute', inset: -40, background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, width: 270, height: 570, background: '#000', borderRadius: 40, border: '8px solid #1a1a24', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
              <img
                src="/images/orbit.png"
                alt="Orbit AI Planner"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Overlay caption */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem 1rem', background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 4 }}>✦ ORBIT</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>Your AI planning companion</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
