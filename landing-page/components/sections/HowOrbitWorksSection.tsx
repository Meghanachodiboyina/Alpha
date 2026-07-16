'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PROMPTS = [
  '"Prepare for my interview"',
  '"Plan my study schedule"',
  '"Balance work and gym"',
  '"Create tomorrow\'s routine"',
  '"Prepare client presentation"',
];

const REASONING_STEPS = [
  { icon: '⚡', text: 'Analyzing priorities...', color: '#ff6b35' },
  { icon: '📅', text: 'Checking schedule constraints...', color: '#8b5cf6' },
  { icon: '⚖️', text: 'Balancing workload...', color: '#3b82f6' },
  { icon: '✦', text: 'Creating routine...', color: '#22c55e' },
];

const TIMELINE_ITEMS = [
  { time: '8:30 AM', task: 'Review interview notes', tag: 'Prep', color: '#ff6b35' },
  { time: '10:00 AM', task: 'Mock interview practice', tag: 'Practice', color: '#8b5cf6' },
  { time: '11:30 AM', task: 'Break & light walk', tag: 'Rest', color: '#22c55e' },
  { time: '1:00 PM', task: 'Research the company', tag: 'Research', color: '#3b82f6' },
  { time: '3:00 PM', task: 'Prepare your questions', tag: 'Prep', color: '#f59e0b' },
  { time: '5:00 PM', task: 'Relax & confidence boost', tag: 'Wind-down', color: '#22c55e' },
];

export default function HowOrbitWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const [typedPrompt, setTypedPrompt] = useState('');
  const [reasoningVisible, setReasoningVisible] = useState(0);
  const [timelineCount, setTimelineCount] = useState(0);

  // Cycle prompt text for Step 1
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        const p = PROMPTS[promptIndex % PROMPTS.length];
        for (let i = 1; i <= p.length; i++) {
          if (cancelled) return;
          setTypedPrompt(p.slice(0, i));
          await delay(32);
        }
        await delay(1400);
        for (let i = p.length; i >= 0; i--) {
          if (cancelled) return;
          setTypedPrompt(p.slice(0, i));
          await delay(14);
        }
        await delay(200);
        if (!cancelled) setPromptIndex(prev => prev + 1);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [promptIndex]);

  // Reasoning animation for Step 2
  useEffect(() => {
    if (activeStep !== 1) { setReasoningVisible(0); return; }
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setReasoningVisible(0);
        for (let i = 1; i <= REASONING_STEPS.length; i++) {
          if (cancelled) return;
          setReasoningVisible(i);
          await delay(600);
        }
        await delay(1200);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [activeStep]);

  // Timeline animation for Step 3
  useEffect(() => {
    if (activeStep !== 2) { setTimelineCount(0); return; }
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setTimelineCount(0);
        await delay(400);
        for (let i = 1; i <= TIMELINE_ITEMS.length; i++) {
          if (cancelled) return;
          setTimelineCount(i);
          await delay(280);
        }
        await delay(2000);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [activeStep]);

  const steps = [
    {
      num: '01',
      title: 'Tell Orbit your day.',
      desc: 'Just type what you need to do. Natural language — no forms, no tags, no formatting.',
    },
    {
      num: '02',
      title: 'Orbit thinks before planning.',
      desc: 'No generic loading spinners. Orbit shows its actual reasoning before generating your schedule.',
    },
    {
      num: '03',
      title: 'Your day is ready.',
      desc: 'A complete, conflict-free schedule drawn timeline by timeline. Tap any item to adjust.',
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="how-orbit-works"
      className="section"
      style={{ background: 'var(--bg-2)', overflow: 'hidden' }}
    >
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className="text-center"
          style={{ maxWidth: 620, marginInline: 'auto', marginBottom: '5rem' }}
        >
          <p className="caption" style={{ color: 'var(--orange)', letterSpacing: '0.1em', marginBottom: '1rem' }}>HOW ORBIT WORKS</p>
          <h2 className="h2">Planning should feel like a conversation.</h2>
        </motion.div>

        {/* Steps selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', maxWidth: 860, marginInline: 'auto', marginBottom: '3.5rem', background: 'var(--border)', borderRadius: 20, overflow: 'hidden' }}>
          {steps.map((step, i) => (
            <motion.button
              key={i}
              onClick={() => setActiveStep(i)}
              whileHover={{ background: 'rgba(255,255,255,0.05)' }}
              style={{
                textAlign: 'left',
                padding: '1.75rem',
                background: activeStep === i ? 'rgba(255,107,53,0.06)' : 'var(--bg-2)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              {activeStep === i && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--orange), var(--orange-2))' }} />
              )}
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', color: activeStep === i ? 'var(--orange)' : 'var(--text-3)', marginBottom: '0.5rem' }}>
                STEP {step.num}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: activeStep === i ? 'var(--text)' : 'var(--text-2)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                {step.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', lineHeight: 1.55, display: activeStep === i ? 'block' : 'none' }}>
                {step.desc}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Animation panel */}
        <div style={{ maxWidth: 700, marginInline: 'auto' }}>
          <AnimatePresence mode="wait">
            {activeStep === 0 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 24, padding: '2.5rem', minHeight: 280 }}
              >
                {/* Phone-like input preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em' }}>ORBIT INPUT</div>
                  <div style={{ background: 'rgba(255,107,53,0.04)', border: '1.5px solid rgba(255,107,53,0.2)', borderRadius: 16, padding: '1.25rem 1.5rem', minHeight: 72, display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                      {typedPrompt}
                      <span style={{ display: 'inline-block', width: 2, height: '1.2em', background: 'var(--orange)', marginLeft: 2, animation: 'orbitBlink 1s infinite', verticalAlign: 'text-bottom' }} />
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {PROMPTS.map((p, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: '0.78rem', padding: '5px 12px', borderRadius: 99,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                          color: 'var(--text-3)', cursor: 'pointer',
                        }}
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 1 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 24, padding: '2.5rem', minHeight: 280 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>ORBIT IS THINKING</div>
                  {REASONING_STEPS.slice(0, reasoningVisible).map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.125rem', background: `${step.color}09`, border: `1px solid ${step.color}20`, borderRadius: 14 }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{step.icon}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text)' }}>{step.text}</span>
                      {i === reasoningVisible - 1 && (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                          {[0, 1, 2].map(j => (
                            <motion.div key={j} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: j * 0.15 }}
                              style={{ width: 5, height: 5, borderRadius: '50%', background: step.color }} />
                          ))}
                        </div>
                      )}
                      {i < reasoningVisible - 1 && <span style={{ marginLeft: 'auto', fontSize: 13, color: step.color, fontWeight: 700 }}>✓</span>}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeStep === 2 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 24, padding: '2.5rem', minHeight: 280, position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>YOUR SCHEDULE — INTERVIEW PREP DAY</div>
                <div style={{ position: 'relative' }}>
                  {/* Timeline line */}
                  <motion.div
                    animate={{ height: timelineCount > 0 ? `${(timelineCount / TIMELINE_ITEMS.length) * 100}%` : '0%' }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    style={{ position: 'absolute', left: 15, top: 16, width: 1.5, background: 'rgba(255,255,255,0.1)', originY: 0 }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {TIMELINE_ITEMS.slice(0, timelineCount).map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                        style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${item.color}18`, border: `2px solid ${item.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                        </div>
                        <div style={{ paddingTop: 4 }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, marginBottom: 2 }}>{item.time}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{item.task}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: `${item.color}15`, color: item.color }}>{item.tag}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <style>{`@keyframes orbitBlink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </section>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
