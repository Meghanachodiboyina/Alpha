'use client';
import { useState, useEffect, useRef } from 'react';

interface Task { time:string; label:string; icon:string; pri:string; color:string; dur:string; ext?:boolean; }

const PROMPTS = [
  {
    input: "morning workout, finish report by 3pm, call mom, team standup at 10, grocery shopping",
    tasks: [
      { time:'6:30 AM', label:'Morning Workout', icon:'🏋️', pri:'Low', color:'#22c55e', dur:'45 min' },
      { time:'9:00 AM', label:'Finish Report', icon:'📄', pri:'High', color:'#ef4444', dur:'1h' },
      { time:'10:00 AM', label:'Team Standup', icon:'👥', pri:'Med', color:'#3b82f6', dur:'30 min' },
      { time:'12:30 PM', label:'Call Mom', icon:'📞', pri:'Low', color:'#22c55e', dur:'15 min' },
      { time:'5:00 PM', label:'Grocery Shopping', icon:'🛒', pri:'Low', color:'#6b7280', dur:'45 min' },
    ],
    tasksR: [
      { time:'6:30 AM', label:'Morning Workout', icon:'🏋️', pri:'Low', color:'#22c55e', dur:'45 min' },
      { time:'9:00 AM', label:'Finish Report', icon:'📄', pri:'High', color:'#ef4444', dur:'1h' },
      { time:'10:00 AM', label:'Team Standup', icon:'👥', pri:'Med', color:'#3b82f6', dur:'1h', ext:true },
      { time:'1:00 PM', label:'Call Mom', icon:'📞', pri:'Low', color:'#22c55e', dur:'15 min' },
      { time:'5:30 PM', label:'Grocery Shopping', icon:'🛒', pri:'Low', color:'#6b7280', dur:'45 min' },
    ],
    notify: 'Standup extended +30min · AI re-optimized',
  },
  {
    input: "review PRs, lunch with Sarah, prepare slides for demo, fix login bug, yoga at 6",
    tasks: [
      { time:'8:00 AM', label:'Review PRs', icon:'🔍', pri:'High', color:'#ef4444', dur:'1h' },
      { time:'9:30 AM', label:'Fix Login Bug', icon:'🐛', pri:'High', color:'#ef4444', dur:'1.5h' },
      { time:'11:30 AM', label:'Prepare Demo Slides', icon:'📊', pri:'Med', color:'#3b82f6', dur:'1h' },
      { time:'12:30 PM', label:'Lunch with Sarah', icon:'🍕', pri:'Low', color:'#22c55e', dur:'45 min' },
      { time:'6:00 PM', label:'Yoga Session', icon:'🧘', pri:'Low', color:'#8b5cf6', dur:'1h' },
    ],
    tasksR: [
      { time:'8:00 AM', label:'Review PRs', icon:'🔍', pri:'High', color:'#ef4444', dur:'1h' },
      { time:'9:30 AM', label:'Fix Login Bug', icon:'🐛', pri:'High', color:'#ef4444', dur:'2.5h', ext:true },
      { time:'12:30 PM', label:'Prepare Demo Slides', icon:'📊', pri:'Med', color:'#3b82f6', dur:'1h' },
      { time:'1:30 PM', label:'Lunch with Sarah', icon:'🍕', pri:'Low', color:'#22c55e', dur:'45 min' },
      { time:'6:00 PM', label:'Yoga Session', icon:'🧘', pri:'Low', color:'#8b5cf6', dur:'1h' },
    ],
    notify: 'Bug fix took longer · AI re-optimized',
  },
  {
    input: "write blog post, client call at 2, design mockups, team retro, pick up kids at 5",
    tasks: [
      { time:'7:30 AM', label:'Write Blog Post', icon:'✍️', pri:'Med', color:'#3b82f6', dur:'1.5h' },
      { time:'9:30 AM', label:'Design Mockups', icon:'🎨', pri:'High', color:'#ef4444', dur:'2h' },
      { time:'12:00 PM', label:'Team Retro', icon:'🔄', pri:'Med', color:'#f59e0b', dur:'45 min' },
      { time:'2:00 PM', label:'Client Call', icon:'📞', pri:'High', color:'#ef4444', dur:'1h' },
      { time:'5:00 PM', label:'Pick Up Kids', icon:'🚗', pri:'High', color:'#ec4899', dur:'30 min' },
    ],
    tasksR: [
      { time:'7:30 AM', label:'Write Blog Post', icon:'✍️', pri:'Med', color:'#3b82f6', dur:'1.5h' },
      { time:'9:30 AM', label:'Design Mockups', icon:'🎨', pri:'High', color:'#ef4444', dur:'2h' },
      { time:'12:00 PM', label:'Team Retro', icon:'🔄', pri:'Med', color:'#f59e0b', dur:'45 min' },
      { time:'2:00 PM', label:'Client Call', icon:'📞', pri:'High', color:'#ef4444', dur:'1.5h', ext:true },
      { time:'5:00 PM', label:'Pick Up Kids', icon:'🚗', pri:'High', color:'#ec4899', dur:'30 min' },
    ],
    notify: 'Client call extended +30min · AI re-optimized',
  },
];

const PHASES:{id:string;ms:number}[] = [
  {id:'idle',ms:800},
  {id:'voice',ms:1400},
  {id:'typing',ms:3200},
  {id:'btn_hover',ms:600},{id:'btn_click',ms:300},
  {id:'processing',ms:1200},
  {id:'streaming',ms:2500},
  {id:'sched',ms:3000},
  {id:'notify',ms:1500},{id:'resched',ms:2800},
  {id:'done',ms:2200},{id:'fade',ms:1200},
];

export default function USPShowcase() {
  const [pi, setPi] = useState(0);
  const [typed, setTyped] = useState('');
  const [visibleTasks, setVisibleTasks] = useState(0);
  const loopIdx = useRef(0);
  const id = PHASES[pi].id;
  const prompt = PROMPTS[loopIdx.current % PROMPTS.length];

  useEffect(() => {
    let on = true;
    (async () => {
      while(on) {
        const cur = PROMPTS[loopIdx.current % PROMPTS.length];
        for(let i=0; i<PHASES.length; i++) {
          if(!on) return;
          setPi(i);
          const p = PHASES[i];
          if(p.id === 'typing') {
            setTyped('');
            for(let j=1; j<=cur.input.length; j++) {
              if(!on) return;
              setTyped(cur.input.slice(0, j));
              await new Promise(r => setTimeout(r, p.ms / cur.input.length));
            }
          } else if(p.id === 'idle') {
            setTyped('');
            setVisibleTasks(0);
            await new Promise(r => setTimeout(r, p.ms));
          } else if(p.id === 'streaming') {
            // Stream tasks in one-by-one
            for(let t=1; t<=cur.tasks.length; t++) {
              if(!on) return;
              setVisibleTasks(t);
              await new Promise(r => setTimeout(r, p.ms / cur.tasks.length));
            }
          } else {
            await new Promise(r => setTimeout(r, p.ms));
          }
        }
        loopIdx.current++;
      }
    })();
    return () => { on = false; };
  }, []);

  const showInput = ['idle','typing','voice','btn_hover','btn_click'].includes(id);
  const showProc = id === 'processing';
  const showSched = ['streaming','sched','notify','resched','done'].includes(id);
  const isResched = ['resched','done'].includes(id);
  const showNotify = ['notify','resched','done'].includes(id);
  const isFade = id === 'fade';
  const tasks: Task[] = isResched ? prompt.tasksR : prompt.tasks;
  const tasksToShow = id === 'streaming' ? tasks.slice(0, visibleTasks) : tasks;

  const waveHeights = [10,16,22,14,20,12,18];

  return (
    <div style={{ width:'100%', aspectRatio:'16/9', position:'relative', overflow:'hidden', borderRadius:16, background:'var(--bg)', fontFamily:'var(--font-body)', opacity:isFade?0:1, transition:'opacity 1s ease' }}>

      {/* Browser chrome */}
      <div style={{ background:'var(--bg-2)', borderBottom:'1px solid var(--border)', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ display:'flex', gap:5 }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }} />)}
        </div>
        <div style={{ flex:1, textAlign:'center', fontSize:'0.72rem', color:'var(--text-3)', fontWeight:600, fontFamily:'var(--font-display)', transition:'all 0.5s ease' }}>
          {showSched ? '✦ Your Optimized Schedule' : '✦ Routinely AI Builder'}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:'clamp(1rem,3vw,2.5rem)', height:'calc(100% - 38px)', position:'relative', overflow:'hidden' }}>

        {/* ── INPUT VIEW ── */}
        {showInput && (
          <div style={{ animation:'uspFadeIn 0.5s ease-out', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'clamp(12px,2vw,24px)' }}>
            <div style={{ textAlign:'center' }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'clamp(0.9rem,1.8vw,1.2rem)', marginBottom:6, color:'var(--text)' }}>
                What do you want to accomplish today?
              </h3>
              <p style={{ fontSize:'clamp(0.65rem,1.2vw,0.8rem)', color:'var(--text-3)' }}>Type or speak your tasks naturally</p>
            </div>

            {/* Input box */}
            <div style={{ width:'100%', maxWidth:520, position:'relative' }}>
              <div style={{
                background:'var(--surface)', borderWidth:1, borderStyle:'solid',
                borderColor:id==='typing'?'var(--orange)':'var(--border)',
                borderRadius:14, padding:'clamp(10px,1.5vw,14px) 48px clamp(10px,1.5vw,14px) clamp(12px,1.5vw,18px)',
                fontSize:'clamp(0.72rem,1.3vw,0.88rem)', minHeight:48, color:'var(--text)',
                lineHeight:1.6, transition:'all 0.3s ease',
                boxShadow:id==='typing'?'0 0 0 3px rgba(255,107,53,0.1)':'none',
              }}>
                {typed}
                {(id==='typing'||id==='idle') && (
                  <span style={{ display:'inline-block', width:2, height:16, background:'var(--orange)', marginLeft:2, animation:'uspBlink 1s infinite', verticalAlign:'middle' }} />
                )}
              </div>

              {/* Voice waveform / mic icon */}
              <div style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', transition:'all 0.4s ease' }}>
                {id === 'voice' ? (
                  <div style={{ display:'flex', alignItems:'center', gap:2, height:24, animation:'uspFadeIn 0.3s ease-out' }}>
                    {waveHeights.map((h,i) => (
                      <div key={i} style={{
                        width:3, borderRadius:2, background:'var(--orange)',
                        height:h, animation:`uspWave 0.6s ${i*0.08}s ease-in-out infinite alternate`,
                        opacity:0.9,
                      }} />
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize:18, opacity: id==='typing' ? 0.25 : 0.4, transition:'opacity 0.3s' }}>🎙️</span>
                )}
              </div>
            </div>

            {/* Generate button */}
            <button style={{
              padding:'clamp(8px,1.2vw,12px) clamp(20px,3vw,32px)', borderRadius:12, border:'none', cursor:'pointer',
              background:id==='btn_click'?'var(--orange-2)':'linear-gradient(135deg, var(--orange), var(--orange-2))',
              color:'white', fontWeight:700, fontSize:'clamp(0.75rem,1.3vw,0.88rem)', fontFamily:'var(--font-display)',
              display:'flex', alignItems:'center', gap:8,
              transform:id==='btn_click'?'scale(0.93)':id==='btn_hover'?'scale(1.05)':'scale(1)',
              boxShadow:id==='btn_hover'
                ?'0 0 0 4px rgba(255,107,53,0.15), 0 12px 28px rgba(255,107,53,0.35)'
                :'0 6px 16px rgba(255,107,53,0.2)',
              transition:'all 0.25s cubic-bezier(0.25,1,0.5,1)',
            }}>
              <span style={{ fontSize:'1.1em' }}>✦</span> Generate with AI
            </button>
          </div>
        )}

        {/* ── PROCESSING VIEW ── */}
        {showProc && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:20, animation:'uspFadeIn 0.4s ease-out' }}>
            <div style={{ position:'relative', width:72, height:72 }}>
              <div style={{
                width:72, height:72, borderRadius:18,
                background:'var(--orange-light)', border:'1px solid rgba(255,107,53,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:32,
                animation:'uspPulse 1.2s ease-in-out infinite',
              }}>✦</div>
              {/* Sparkle dots orbiting */}
              {[0,1,2,3,4,5].map(i => {
                const angle = i * 60 * Math.PI / 180;
                const r = 44;
                return (
                  <div key={i} style={{
                    position:'absolute', width:5, height:5, borderRadius:'50%',
                    background:'var(--orange)',
                    left: 36 + Math.cos(angle) * r - 2.5,
                    top: 36 + Math.sin(angle) * r - 2.5,
                    animation:`uspPulse 1s ${i*0.15}s ease-in-out infinite`,
                    opacity:0.6,
                  }} />
                );
              })}
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ color:'var(--text)', fontSize:'0.88rem', fontWeight:600, fontFamily:'var(--font-display)', marginBottom:6 }}>
                Analyzing your tasks...
              </p>
              <p style={{ color:'var(--text-3)', fontSize:'0.72rem' }}>Optimizing priorities, timing & energy levels</p>
            </div>
            <div style={{ width:220, height:4, borderRadius:3, background:'var(--surface)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:3, background:'linear-gradient(90deg, var(--orange), var(--orange-2))', animation:'uspProgress 2.2s ease-out forwards' }} />
            </div>
          </div>
        )}

        {/* ── SCHEDULE VIEW ── */}
        {showSched && (
          <div style={{ animation:'uspFadeIn 0.5s ease-out', height:'100%', position:'relative', display:'flex', flexDirection:'column' }}>

            {/* Notification badge */}
            {showNotify && (
              <div style={{
                position:'absolute', top:-4, right:0, zIndex:10,
                background:'rgba(59,130,246,0.08)', backdropFilter:'blur(16px)',
                WebkitBackdropFilter:'blur(16px)',
                border:'1px solid rgba(59,130,246,0.15)', borderRadius:12,
                padding:'7px 14px', animation:'uspSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                display:'flex', alignItems:'center', gap:8,
              }}>
                <span style={{ fontSize:13 }}>🔄</span>
                <span style={{ fontSize:'0.68rem', fontWeight:600, color:'#3b82f6' }}>{prompt.notify}</span>
              </div>
            )}

            {/* Timeline */}
            <div style={{ display:'flex', flexDirection:'column', gap:'clamp(4px,0.8vw,8px)', paddingLeft:22, borderLeft:'2px solid var(--border)', marginLeft:10, flex:1, justifyContent:'center' }}>
              {tasksToShow.map((t, i) => (
                <div key={`${t.label}-${t.time}`} style={{
                  display:'flex', alignItems:'center', gap:'clamp(6px,1vw,12px)',
                  padding:'clamp(6px,1vw,10px) clamp(8px,1.2vw,14px)',
                  background:t.ext?'rgba(59,130,246,0.05)':'var(--card-bg)',
                  border:`1px solid ${t.ext?'rgba(59,130,246,0.2)':'var(--border)'}`,
                  borderRadius:12, position:'relative',
                  animation: id==='streaming' ? 'uspCardIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
                  transition:'all 0.6s cubic-bezier(0.25,1,0.5,1)',
                }}>
                  {/* Timeline dot */}
                  <div style={{ position:'absolute', left:-28, width:10, height:10, borderRadius:'50%', background:t.color, border:'2.5px solid var(--bg)', boxShadow:`0 0 0 1px ${t.color}40` }} />
                  {/* Time */}
                  <div style={{ minWidth:'clamp(48px,7vw,68px)', fontSize:'clamp(0.6rem,1vw,0.75rem)', fontWeight:700, color:'var(--text-3)', fontFamily:'var(--font-display)' }}>{t.time}</div>
                  {/* Icon */}
                  <div style={{ width:'clamp(24px,3.5vw,34px)', height:'clamp(24px,3.5vw,34px)', borderRadius:8, background:`${t.color}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(12px,1.8vw,16px)', flexShrink:0 }}>{t.icon}</div>
                  {/* Label */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'clamp(0.68rem,1.1vw,0.82rem)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.label}</div>
                    <div style={{ fontSize:'clamp(0.55rem,0.9vw,0.68rem)', color:'var(--text-3)' }}>{t.dur}</div>
                  </div>
                  {/* Priority pill */}
                  <span style={{ fontSize:'clamp(0.5rem,0.8vw,0.62rem)', fontWeight:700, padding:'2px 8px', borderRadius:99, background:`${t.color}10`, color:t.color, flexShrink:0 }}>{t.pri}</span>
                  {/* Extended badge */}
                  {t.ext && <span style={{ fontSize:'clamp(0.5rem,0.75vw,0.6rem)', fontWeight:700, padding:'2px 6px', borderRadius:6, background:'rgba(59,130,246,0.08)', color:'#3b82f6', animation:'uspPulse 2s infinite', flexShrink:0 }}>↕ Extended</span>}
                </div>
              ))}
            </div>

            {/* AI badge at bottom */}
            {isResched && (
              <div style={{ textAlign:'center', paddingTop:8, animation:'uspFadeIn 0.5s 0.3s ease-out both' }}>
                <span style={{ fontSize:'clamp(0.6rem,0.9vw,0.72rem)', color:'var(--orange)', fontWeight:600 }}>✦ Schedule re-optimized automatically</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cursor */}
      {['btn_hover','btn_click'].includes(id) && (
        <div style={{
          position:'absolute', zIndex:100, pointerEvents:'none',
          left:'55%', top:'72%',
          transform:id==='btn_click'?'scale(0.8)':'scale(1)',
          transition:'all 0.15s ease',
          filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}>
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
            <path d="M4 2.5L16.5 14L10.5 14.5L14 20.5L11 22L7.5 16L3.5 19.5V2.5Z" fill="black" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      <style>{`
        @keyframes uspFadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes uspBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes uspWave { 0%{transform:scaleY(0.3)} 100%{transform:scaleY(1)} }
        @keyframes uspPulse { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.1);opacity:1} }
        @keyframes uspProgress { from{width:0%} to{width:100%} }
        @keyframes uspSlideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes uspCardIn { from{opacity:0;transform:translateX(-16px) scale(0.96)} to{opacity:1;transform:translateX(0) scale(1)} }
      `}</style>
    </div>
  );
}
