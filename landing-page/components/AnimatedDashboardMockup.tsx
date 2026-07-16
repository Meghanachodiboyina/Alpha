'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Hero shows orbit.png (AI builder) as base, then creation.png slides up
const PHASES = [
  { id: 'idle', ms: 2000 },
  { id: 'cur_input', ms: 1200 },
  { id: 'typing', ms: 2000 },
  { id: 'cur_btn', ms: 800 },
  { id: 'click', ms: 400 },
  { id: 'show_dash', ms: 2500 },
  { id: 'done', ms: 1000 },
];

export default function AnimatedDashboardMockup() {
  const [pi, setPi] = useState(0);
  const [typed, setTyped] = useState('');
  const id = PHASES[pi].id;

  useEffect(() => {
    let on = true;
    (async () => {
      while (on) {
        for (let i = 0; i < PHASES.length; i++) {
          if (!on) return;
          setPi(i);
          const p = PHASES[i];
          if (p.id === 'idle') {
            setTyped('');
            await new Promise(r => setTimeout(r, p.ms));
          } else if (p.id === 'typing') {
            const txt = 'Gym at 6 PM, deep work, dinner at 8.';
            for (let j = 1; j <= txt.length; j++) {
              if (!on) return;
              setTyped(txt.slice(0, j));
              await new Promise(r => setTimeout(r, p.ms / txt.length));
            }
          } else {
            await new Promise(r => setTimeout(r, p.ms));
          }
        }
      }
    })();
    return () => { on = false; };
  }, []);

  // Cursor positions over orbit.png layout
  let cx = '50%';
  let cy = '85%';
  if (id === 'idle') { cx = '60%'; cy = '50%'; }
  else if (id === 'cur_input' || id === 'typing') { cx = '35%'; cy = '79%'; }
  else if (id === 'cur_btn' || id === 'click') { cx = '78%'; cy = '85%'; }
  else if (id === 'show_dash' || id === 'done') { cx = '50%'; cy = '50%'; }

  const fast = id === 'click';
  const curOpacity = ['idle', 'show_dash', 'done'].includes(id) ? 0 : 1;
  const showTypingOverlay = ['typing', 'cur_btn', 'click'].includes(id);
  const showDash = ['show_dash', 'done'].includes(id);

  return (
    <div className="anim-scale-in" style={{ position: 'relative', width: 320, height: 690, marginInline: 'auto' }}>
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', background: '#000', borderRadius: 45, border: '10px solid #1a1a24', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 0 10px rgba(255,255,255,0.05)' }}>

        {/* Base: Orbit AI screen */}
        <img src="/images/orbit.png" alt="Orbit AI Builder" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

        {/* Typing text overlay on the input field */}
        {showTypingOverlay && (
          <div style={{ position: 'absolute', bottom: '17%', left: '10%', width: '60%', height: 28, display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 12.5, fontWeight: 500, zIndex: 10, fontFamily: 'sans-serif', letterSpacing: 0.1 }}>
            {typed}
            {id === 'typing' && <span style={{ width: 1.5, height: 16, background: 'white', marginLeft: 3, animation: 'mockBlink 1s infinite', display: 'inline-block' }} />}
          </div>
        )}

        {/* Dashboard fade-in overlay after "Plan my day" is clicked */}
        <motion.img
          src="/images/dashboard.png"
          alt="Dashboard Result"
          initial={{ opacity: 0 }}
          animate={{ opacity: showDash ? 1 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
        />

        {/* Cursor */}
        <div style={{ position: 'absolute', zIndex: 1000, pointerEvents: 'none', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))', left: cx, top: cy, opacity: curOpacity, transform: `translate(-5px,-5px) scale(${fast ? 0.8 : 1})`, transition: fast ? 'all 0.12s ease' : 'all 0.65s cubic-bezier(0.25,1,0.5,1)' }}>
          <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
            <path d="M4 2.5L16.5 14L10.5 14.5L14 20.5L11 22L7.5 16L3.5 19.5V2.5Z" fill="white" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <style>{`@keyframes mockBlink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}