'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const STEPS = [
  {
    num: '01',
    title: 'Describe your day.',
    subtitle: 'Type naturally.',
    desc: 'Just say what\'s on your mind. No forms, no formats, no rigid categories.',
    example: '"I need to finish my project, go to the gym, and buy groceries."',
    icon: '💬',
    color: '#ff6b35',
  },
  {
    num: '02',
    title: 'AI asks questions.',
    subtitle: 'Clarification-first intelligence.',
    desc: 'Routinely identifies missing information and asks only what matters — nothing more.',
    example: '"What time do you need to finish the project by?"',
    icon: '🤔',
    color: '#8b5cf6',
  },
  {
    num: '03',
    title: 'Schedule generated.',
    subtitle: 'A realistic, complete plan.',
    desc: 'AI creates a full-day plan with focus blocks, recovery breaks, travel buffers, and smart sequencing.',
    example: null,
    icon: '✦',
    color: '#3b82f6',
    tags: ['Focus blocks', 'Recovery breaks', 'Travel buffers', 'Smart sequencing'],
  },
  {
    num: '04',
    title: 'Execute with confidence.',
    subtitle: 'Follow the plan, stay focused.',
    desc: 'A clear, prioritized schedule removes decision fatigue so you can focus on doing the work.',
    example: null,
    icon: '🎯',
    color: '#22c55e',
  },
];

export default function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.9], ['0%', '100%']);

  return (
    <section className="section" style={{ background: 'var(--bg-2)', overflow: 'hidden' }}>
      <div className="container">
        <motion.div
          className="text-center"
          style={{ maxWidth: 600, marginInline: 'auto', marginBottom: '5rem' }}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <div className="pill pill-orange mb-6" style={{ display: 'inline-flex' }}>How it works</div>
          <h2 className="h2" style={{ marginBottom: '1rem' }}>From chaos to clarity in four steps.</h2>
        </motion.div>

        <div ref={ref} style={{ maxWidth: 680, marginInline: 'auto', position: 'relative' }}>
          {/* Animated timeline line */}
          <div style={{ position: 'absolute', left: 19, top: 40, width: 2, height: 'calc(100% - 80px)', background: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
            <motion.div style={{ width: '100%', height: lineHeight, background: 'linear-gradient(180deg, var(--orange), var(--orange-2))', borderRadius: 1, originY: 0 }} />
          </div>

          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ type: 'spring', stiffness: 260, damping: 22, delay: i * 0.05 }}
              style={{ display: 'flex', gap: '2rem', marginBottom: i < STEPS.length - 1 ? '3.5rem' : 0, position: 'relative', zIndex: 1 }}
            >
              {/* Step indicator */}
              <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: `${step.color}18`, border: `2px solid ${step.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, position: 'relative', zIndex: 2 }}>
                <span>{step.icon}</span>
              </div>

              {/* Content */}
              <div style={{ paddingTop: 6, flex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: step.color, marginBottom: 4 }}>Step {step.num}</div>
                <h3 className="h3" style={{ marginBottom: 2, color: 'var(--text)' }}>{step.title}</h3>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.75rem' }}>{step.subtitle}</div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.65, marginBottom: step.example || step.tags ? '1rem' : 0 }}>{step.desc}</p>
                {step.example && (
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0.875rem 1rem', fontSize: '0.85rem', color: 'var(--text-2)', fontStyle: 'italic', lineHeight: 1.5 }}>
                    {step.example}
                  </div>
                )}
                {step.tags && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {step.tags.map((tag, ti) => (
                      <span key={ti} style={{ fontSize: '0.78rem', fontWeight: 600, padding: '4px 12px', borderRadius: 99, background: `${step.color}12`, border: `1px solid ${step.color}25`, color: step.color }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
