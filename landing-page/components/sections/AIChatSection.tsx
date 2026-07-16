'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
  id: number;
  role: 'user' | 'ai';
  text: string;
  delay: number;
};

const CONVERSATION: Message[] = [
  { id: 1, role: 'user', text: 'I need to study SQL, gym at 6 PM, and meet friends tonight.', delay: 0 },
  { id: 2, role: 'ai', text: 'Got it! A couple of quick questions to build the perfect schedule for you.', delay: 1800 },
  { id: 3, role: 'ai', text: 'What time are you meeting friends tonight?', delay: 3200 },
  { id: 4, role: 'user', text: 'Around 9 PM.', delay: 5000 },
  { id: 5, role: 'ai', text: 'How long is your gym session usually?', delay: 6400 },
  { id: 6, role: 'user', text: 'About 1 hour.', delay: 7800 },
  { id: 7, role: 'ai', text: 'Perfect. Building your schedule now...', delay: 9200 },
];

const SCHEDULE = [
  { time: '9:00 AM', task: 'SQL Study Session', icon: '📚', color: '#3b82f6' },
  { time: '12:00 PM', task: 'Lunch Break', icon: '🥗', color: '#22c55e' },
  { time: '1:00 PM', task: 'SQL Practice & Review', icon: '💻', color: '#3b82f6' },
  { time: '5:00 PM', task: 'Get ready + Travel to gym', icon: '🚶', color: '#f59e0b' },
  { time: '6:00 PM', task: 'Gym Session', icon: '💪', color: '#ff6b35' },
  { time: '7:15 PM', task: 'Shower + Wind down', icon: '🚿', color: '#8b5cf6' },
  { time: '9:00 PM', task: 'Meet Friends', icon: '👥', color: '#ec4899' },
];

const LOOP_DURATION = 16000;

export default function AIChatSection() {
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [visibleScheduleItems, setVisibleScheduleItems] = useState(0);
  const [typingFor, setTypingFor] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timers: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setVisibleMessages([]);
      setShowSchedule(false);
      setVisibleScheduleItems(0);
      setTypingFor(null);

      CONVERSATION.forEach((msg) => {
        // Show typing indicator before each message
        const typingTimer = setTimeout(() => {
          if (!cancelled) setTypingFor(msg.id);
        }, msg.delay);
        timers.push(typingTimer);

        // Then show the message
        const msgTimer = setTimeout(() => {
          if (!cancelled) {
            setTypingFor(null);
            setVisibleMessages(prev => [...prev, msg.id]);
          }
        }, msg.delay + 900);
        timers.push(msgTimer);
      });

      // Show schedule after conversation ends
      const scheduleTimer = setTimeout(() => {
        if (!cancelled) {
          setShowSchedule(true);
          SCHEDULE.forEach((_, i) => {
            const t = setTimeout(() => {
              if (!cancelled) setVisibleScheduleItems(prev => prev + 1);
            }, 400 + i * 220);
            timers.push(t);
          });
        }
      }, 11200);
      timers.push(scheduleTimer);

      // Loop
      const loopTimer = setTimeout(() => {
        if (!cancelled) {
          timers.forEach(clearTimeout);
          timers = [];
          run();
        }
      }, LOOP_DURATION + 3000);
      timers.push(loopTimer);
    };

    run();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, []);

  return (
    <section className="section" style={{ background: 'var(--bg-2)', overflow: 'hidden' }}>
      <div className="container">
        <div className="text-center" style={{ maxWidth: 640, marginInline: 'auto', marginBottom: '4rem' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <div className="pill pill-orange mb-6" style={{ display: 'inline-flex' }}>✦ AI Conversation</div>
            <h2 className="h2" style={{ marginBottom: '1rem' }}>Watch AI build your schedule.</h2>
            <p className="body-lg text-muted">
              Routinely doesn't just generate tasks. It understands context, asks clarifying questions, and creates realistic schedules.
            </p>
          </motion.div>
        </div>

        {/* Phone + Schedule side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', alignItems: 'flex-start', maxWidth: 900, marginInline: 'auto' }}>

          {/* Phone Mockup with Chat */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            style={{ display: 'flex', justifyContent: 'center' }}
          >
            <div style={{ width: 300, height: 620, background: '#0a0a0f', borderRadius: 42, border: '8px solid #1a1a24', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 0 10px rgba(255,255,255,0.03)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {/* Status bar */}
              <div style={{ padding: '14px 20px 8px', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'white', flexShrink: 0 }}>
                <span>4:35</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="white"><rect x="0" y="3" width="3" height="7" rx="1" /><rect x="4" y="2" width="3" height="8" rx="1" /><rect x="8" y="1" width="3" height="9" rx="1" /><rect x="12" y="0" width="3" height="10" rx="1" /></svg>
                  <div style={{ width: 20, height: 10, border: '1px solid rgba(255,255,255,0.4)', borderRadius: 2, position: 'relative' }}>
                    <div style={{ width: 14, height: 6, background: '#22c55e', margin: 1, borderRadius: 1 }} />
                  </div>
                </div>
              </div>

              {/* Header */}
              <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b35, #ff8c42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✦</div>
                <div>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-display)' }}>Orbit</div>
                  <div style={{ color: '#22c55e', fontSize: 10, fontWeight: 600 }}>● Online</div>
                </div>
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, overflowY: 'hidden', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AnimatePresence>
                  {CONVERSATION.map(msg => (
                    visibleMessages.includes(msg.id) && (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        style={{
                          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          maxWidth: '82%',
                          background: msg.role === 'user' ? '#ff6b35' : 'rgba(255,255,255,0.06)',
                          color: 'white',
                          borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          padding: '9px 13px',
                          fontSize: 12,
                          lineHeight: 1.45,
                          border: msg.role === 'ai' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                        }}
                      >
                        {msg.text}
                      </motion.div>
                    )
                  ))}

                  {/* Typing indicator */}
                  {typingFor !== null && !visibleMessages.includes(typingFor) && (
                    <motion.div
                      key={`typing-${typingFor}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ alignSelf: CONVERSATION.find(m => m.id === typingFor)?.role === 'user' ? 'flex-end' : 'flex-start', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}
                    >
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                          style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input bar */}
              <div style={{ padding: '10px 14px 20px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 22, border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#555', fontSize: 12 }}>Tell me what you need to do...</span>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ff6b35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Generated Schedule */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.1 }}
            style={{ paddingTop: '2rem' }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--orange)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>✦ Generated Schedule</div>
              <h3 className="h3" style={{ color: 'var(--text)', marginBottom: 4 }}>Your optimized day</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>AI-built around your real-life constraints</p>
            </div>

            <AnimatePresence>
              {showSchedule && SCHEDULE.slice(0, visibleScheduleItems).map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem', position: 'relative' }}
                >
                  {/* Timeline line */}
                  {i < SCHEDULE.length - 1 && (
                    <div style={{ position: 'absolute', left: 19, top: 36, width: 2, height: 'calc(100% + 0.5rem)', background: 'rgba(255,255,255,0.06)' }} />
                  )}
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${item.color}18`, border: `1px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, zIndex: 1 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 2 }}>{item.time}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{item.task}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!showSchedule && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {SCHEDULE.map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 8, width: 50, borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginBottom: 6 }} />
                      <div style={{ height: 12, width: `${60 + i * 10}%`, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </section>
  );
}
