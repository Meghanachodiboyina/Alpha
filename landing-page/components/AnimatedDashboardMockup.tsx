'use client';
import { useState, useEffect, useRef } from 'react';

const CARDS = [
  { label:'Total Routines', value:12, icon:'📅', accent:'#FF6B35', desc:'All routines organized in one place', uv:13 },
  { label:'Completed', value:8, icon:'✅', accent:'#22c55e', desc:"Tasks you've accomplished today", uv:8 },
  { label:'Pending', value:4, icon:'⏳', accent:'#f59e0b', desc:'Items awaiting your attention', uv:5 },
  { label:'Productivity', value:'88%', icon:'⚡', accent:'#3b82f6', desc:'Your weekly efficiency score', uv:'88%' },
];

const SECTIONS = [
  { id:'stats', icon:'📊', label:'Dashboard Stats', desc:'Track your productivity metrics at a glance', accent:'#FF6B35',
    line:'M 50 0 C 50 25, 40 45, 35 60', tipLeft:'15%' },
  { id:'recent', icon:'🕐', label:'Recent Routines', desc:"See what's coming up next in your day", accent:'#22c55e',
    line:'M 50 0 C 50 25, 55 45, 60 60', tipLeft:'25%' },
  { id:'actions', icon:'⚡', label:'Quick Actions', desc:'Jump to key features instantly', accent:'#3b82f6',
    line:'M 50 0 C 50 25, 40 45, 35 60', tipLeft:'5%' },
];

const PHASES = [
  { id:'idle', ms:1200 },
  { id:'hl_stats', ms:1500 },{ id:'hl_recent', ms:1500 },{ id:'hl_actions', ms:1500 },
  { id:'settle', ms:1000 },
  { id:'cur_in', ms:500 },{ id:'cur_btn', ms:700 },{ id:'click', ms:300 },
  { id:'modal', ms:400 },
  { id:'typing', ms:1200 },
  { id:'pri', ms:600 },{ id:'dd', ms:500 },{ id:'sel', ms:300 },
  { id:'create', ms:500 },{ id:'save', ms:700 },
  { id:'done', ms:2500 },{ id:'fade', ms:1000 },
];

const RANDOM_TASKS = [
  "Review weekly metrics",
  "Prepare presentation",
  "Write project proposal",
  "Call with marketing team",
  "Update design system",
  "Clear email inbox",
  "Plan product roadmap",
  "Fix landing page bugs",
  "Deploy new release",
  "Team sync meeting"
];

function SectionTooltip({ sec }: { sec: typeof SECTIONS[number] }) {
  const endX = sec.line.split(' ').slice(-2)[0];
  const endY = sec.line.split(' ').slice(-1)[0];
  return (
    <div style={{ position:'absolute', top:'100%', left:0, width:'100%', zIndex:31, pointerEvents:'none', marginTop:4 }}>
      <svg viewBox="0 0 100 65" fill="none" style={{ width:'100%', height:55, overflow:'visible' }}>
        <path d={sec.line} stroke={sec.accent} strokeWidth="1.5" strokeLinecap="round" fill="none"
          style={{ strokeDasharray:200, strokeDashoffset:0, animation:'mockDrawLine 0.6s ease-out both', filter:`drop-shadow(0 0 4px ${sec.accent}40)` }} />
        <circle cx={endX} cy={endY} r="2.5" fill={sec.accent} style={{ animation:'mockFadeIn 0.4s 0.4s ease-out both' }} />
      </svg>
      <div style={{ position:'relative', left:sec.tipLeft, background:'rgba(255,255,255,0.75)', backdropFilter:'blur(20px) saturate(180%)', WebkitBackdropFilter:'blur(20px) saturate(180%)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(255,255,255,0.5)', borderRadius:16, padding:'14px 20px', width:240, boxShadow:`0 16px 40px rgba(0,0,0,0.08), 0 0 0 1px ${sec.accent}15`, animation:'mockTooltipIn 0.5s 0.2s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:`${sec.accent}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{sec.icon}</div>
          <span style={{ fontSize:'0.8rem', fontWeight:700, fontFamily:'var(--font-display)', color:'var(--text)' }}>{sec.label}</span>
        </div>
        <p style={{ fontSize:'0.72rem', color:'var(--text-2)', lineHeight:1.5, margin:0 }}>{sec.desc}</p>
      </div>
    </div>
  );
}

export default function AnimatedDashboardMockup() {
  const [pi, setPi] = useState(0);
  const [typed, setTyped] = useState('');
  const [cur, setCur] = useState({ x: -100, y: -100, o: 0, s: 1, tr: 'none' });
  const id = PHASES[pi].id;

  const taskRef = useRef(RANDOM_TASKS[0]);
  const contRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const priRef = useRef<HTMLDivElement>(null);
  const ddHighRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      while(on){
        for(let i=0;i<PHASES.length;i++){
          if(!on) return;
          setPi(i);
          const p = PHASES[i];
          if(p.id === 'idle') {
            taskRef.current = RANDOM_TASKS[Math.floor(Math.random() * RANDOM_TASKS.length)];
            setTyped('');
            await new Promise(r=>setTimeout(r, p.ms));
          } else if(p.id === 'typing') {
            const txt = taskRef.current;
            for(let j=1; j<=txt.length; j++) {
              if(!on) return;
              setTyped(txt.slice(0, j));
              await new Promise(r=>setTimeout(r, p.ms / txt.length));
            }
          } else {
            await new Promise(r=>setTimeout(r, p.ms));
          }
        }
      }
    })();
    return () => { on = false; };
  }, []);

  useEffect(() => {
    const getPos = (ref: React.RefObject<HTMLElement | null>, ox=0, oy=0) => {
      if(!ref.current || !contRef.current) return null;
      const r = ref.current.getBoundingClientRect();
      const c = contRef.current.getBoundingClientRect();
      return { x: r.left - c.left + r.width/2 + ox, y: r.top - c.top + r.height/2 + oy };
    };

    const fast = id==='click'||id==='create';
    const tr = fast ? 'all 0.1s ease' : 'all 0.6s cubic-bezier(0.25,1,0.5,1)';
    const s = fast ? 0.8 : 1;
    const o = ['idle','hl_stats','hl_recent','hl_actions','settle','done','fade'].includes(id) ? 0 : 1;

    setTimeout(() => {
      let pos: {x:number,y:number} | null = null;
      if(id === 'cur_in') {
         if(contRef.current) pos = { x: contRef.current.offsetWidth - 80, y: 80 };
      } else if(id === 'cur_btn' || id === 'click') {
         pos = getPos(btnRef, 15, 10);
      } else if(id === 'modal' || id === 'typing') {
         pos = getPos(inputRef, 40, 15);
      } else if(id === 'pri') {
         pos = getPos(priRef, 30, 10);
      } else if(id === 'dd' || id === 'sel') {
         pos = getPos(ddHighRef, 20, 0);
      } else if(id === 'create' || id === 'save') {
         pos = getPos(createRef, 40, 10);
      }
      
      setCur(prev => ({ 
        x: pos ? pos.x : prev.x, 
        y: pos ? pos.y : prev.y, 
        o, s, tr 
      }));
    }, 50);
  }, [id]);

  const hlTarget = id.startsWith('hl_') ? id.slice(3) : null;
  const isHl = !!hlTarget;
  const secIdx = hlTarget ? SECTIONS.findIndex(s=>s.id===hlTarget) : -1;
  const sec = secIdx >= 0 ? SECTIONS[secIdx] : null;
  const showModal = ['modal','typing','pri','dd','sel','create','save'].includes(id);
  const done = id==='done'||id==='fade';
  const priSel = ['sel','create','save'].includes(id);

  const sty = (section: string): React.CSSProperties => {
    if (!isHl) return { transition:'all 0.7s cubic-bezier(0.25,1,0.5,1)' };
    const active = section === hlTarget;
    return {
      transition:'all 0.7s cubic-bezier(0.25,1,0.5,1)', position:'relative' as const,
      transform: active ? 'translateY(-8px) scale(1.04)' : 'scale(0.96)',
      opacity: active ? 1 : 0.3, filter: active ? 'none' : 'blur(2px)',
      zIndex: active ? 20 : 1,
      boxShadow: active && sec ? `0 20px 50px ${sec.accent}30, 0 0 40px ${sec.accent}15` : 'none',
    };
  };

  const curStyle = (): React.CSSProperties => {
    return { 
      position:'absolute', zIndex:1000, pointerEvents:'none', 
      filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
      left: cur.x, top: cur.y, opacity: cur.o, transform: `scale(${cur.s})`, transition: cur.tr
    };
  };

  const particles = Array.from({length:8},(_,i)=>i);

  return (
    <div ref={contRef} className="anim-scale-in hero-mockup" style={{ marginTop:'5rem', maxWidth:980, marginInline:'auto', position:'relative', perspective:1200 }}>
      <div style={{ position:'absolute', inset:-60, background:`radial-gradient(ellipse at ${isHl?['40%','30%','70%'][secIdx]:'50%'} 40%, rgba(255,107,53,${isHl?0.15:0.08}) 0%, transparent 70%)`, borderRadius:'50%', filter:'blur(50px)', zIndex:0, transition:'all 1.2s ease' }} />
      {particles.map(i => (
        <div key={i} style={{ position:'absolute', width:3+i%3, height:3+i%3, borderRadius:'50%', background:`rgba(255,107,53,${0.15+i*0.03})`, left:`${10+i*11}%`, top:`${15+((i*17)%60)}%`, zIndex:0, animation:`mockFloat${i%3} ${4+i*0.7}s ease-in-out infinite`, animationDelay:`${i*0.4}s`, opacity:isHl?0.8:0.3, transition:'opacity 1s' }} />
      ))}

      <div style={{ position:'relative', zIndex:1, background:'var(--bg-2)', borderWidth:1, borderStyle:'solid', borderColor:'var(--border-strong)', borderRadius:24, overflow:'visible', boxShadow:'0 40px 80px rgba(0,0,0,0.5)', transformStyle:'preserve-3d', transition:'transform 0.9s cubic-bezier(0.25,1,0.5,1)', transform:isHl?'scale(1.015) rotateX(1deg)':'scale(1) rotateX(0)' }}>

        {/* Browser chrome */}
        <div style={{ background:'var(--bg-3)', borderBottom:'1px solid var(--border)', padding:'0.875rem 1.5rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <div style={{ display:'flex', gap:6 }}>
            {['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{ width:12, height:12, borderRadius:'50%', background:c }} />)}
          </div>
          <div style={{ flex:1, height:28, background:'var(--bg-2)', borderRadius:6, borderWidth:1, borderStyle:'solid', borderColor:'var(--border)', display:'flex', alignItems:'center', paddingInline:'0.75rem', maxWidth:300, marginInline:'auto' }}>
            <span style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>app.arc.ai/dashboard</span>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'220px 1fr' }}>
          {/* Sidebar */}
          <div style={{ background:'var(--bg-2)', borderRight:'1px solid var(--border)', padding:'1.25rem 1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.5rem' }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,var(--orange),var(--orange-2))', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 3L17 7v6l-7 4-7-4V7l7-4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="10" cy="10" r="2" fill="white"/></svg>
              </div>
              <span style={{ fontSize:'0.875rem', fontWeight:700, fontFamily:'var(--font-display)' }}>Routinely</span>
            </div>
            {[{l:'Dashboard',a:true},{l:'My Routines'},{l:'Tasks'},{l:'Projects'},{l:'Analytics'}].map((t,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'0.625rem 0.75rem', borderRadius:8, marginBottom:2, background:t.a?'var(--orange-light)':'transparent', color:t.a?'var(--orange-2)':'var(--text-3)', fontSize:'0.8125rem', fontWeight:t.a?600:400 }}>
                <span>{['⊞','◷','✓','⊞','◉'][i]}</span><span>{t.l}</span>
              </div>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding:'1.5rem', background:'var(--bg)', position:'relative', minHeight:420 }}>
            {/* Greeting */}
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:20, opacity:isHl?0.35:1, filter:isHl?'blur(1.5px)':'none', transition:'all 0.7s ease' }}>
              <div>
                <p style={{ fontSize:'0.65rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', marginBottom:4 }}>Monday, 28 April</p>
                <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.25rem', fontWeight:700, letterSpacing:'-0.02em' }}>Good morning, Alex 👋</h1>
              </div>
              <div ref={btnRef} style={{ padding:'6px 12px', borderRadius:8, fontSize:'0.75rem', fontWeight:600, borderWidth:1, borderStyle:'solid', borderColor:'var(--orange)', background:'var(--orange-light)', color:'var(--orange-2)', transform:id==='click'?'scale(0.9)':'scale(1)', transition:'all 0.15s', boxShadow:id==='cur_btn'?'0 0 0 3px rgba(255,107,53,0.25)':'none' }}>+ New Routine</div>
            </div>

            {/* Stats Section */}
            <div style={{ ...sty('stats'), borderRadius:16, padding: hlTarget==='stats'?4:0, borderWidth: hlTarget==='stats'?2:0, borderStyle:'solid', borderColor: hlTarget==='stats'?`${SECTIONS[0].accent}60`:'transparent', marginBottom:20, overflow:'visible' }}>
              {hlTarget==='stats' && <div style={{ position:'absolute', inset:-6, borderRadius:22, background:`radial-gradient(ellipse, ${SECTIONS[0].accent}18, transparent 70%)`, zIndex:-1, animation:'mockPulseGlow 2s ease-in-out infinite' }} />}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                {CARDS.map((c,i) => (
                  <div key={i} style={{ background:'var(--card-bg)', borderWidth:1, borderStyle:'solid', borderColor:'var(--border)', borderRadius:16, padding:16, display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:`${c.accent}18`, borderWidth:1, borderStyle:'solid', borderColor:`${c.accent}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{c.icon}</div>
                    <div>
                      <div style={{ fontSize:'1.25rem', fontWeight:700, fontFamily:'var(--font-display)' }}>{done?c.uv:c.value}</div>
                      <div style={{ fontSize:'0.65rem', color:'var(--text-3)', marginTop:2 }}>{c.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              {hlTarget==='stats' && <SectionTooltip sec={SECTIONS[0]} />}
            </div>

            {/* Bottom grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:16 }}>
              {/* Recent Routines */}
              <div style={{ ...sty('recent'), borderRadius:16, borderWidth: hlTarget==='recent'?2:1, borderStyle:'solid', borderColor: hlTarget==='recent'?`${SECTIONS[1].accent}60`:'var(--border)', background:'var(--card-bg)', overflow:'visible' }}>
                {hlTarget==='recent' && <div style={{ position:'absolute', inset:-6, borderRadius:22, background:`radial-gradient(ellipse, ${SECTIONS[1].accent}18, transparent 70%)`, zIndex:-1, animation:'mockPulseGlow 2s ease-in-out infinite' }} />}
                <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid var(--border)' }}>
                  <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.9rem' }}>Recent Routines</h3>
                </div>
                <div style={{ padding:8, display:'flex', flexDirection:'column', gap:4 }}>
                  {done && (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:10, background:'var(--orange-light)', borderWidth:1, borderStyle:'solid', borderColor:'rgba(255,107,53,0.3)', animation:'mockSlideIn 0.4s ease-out' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:'rgba(245,158,11,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>⏳</div>
                        <div><div style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--orange-2)' }}>{taskRef.current}</div><div style={{ fontSize:'0.65rem', color:'var(--orange-2)', opacity:0.8 }}>Today</div></div>
                      </div>
                      <span style={{ fontSize:'0.6rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'rgba(239,68,68,0.15)', color:'#ef4444' }}>High</span>
                    </div>
                  )}
                  {[{t:'Morning Flow',s:'done',time:'08:00',p:'Low'},{t:'Client Pitch Deck',s:'pen',time:'10:00',p:'High'},{t:'Inbox Zero',s:'pen',time:'16:00',p:'Medium'}].slice(0,done?2:3).map((r,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:10, opacity:r.s==='done'?0.6:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:r.s==='done'?'rgba(34,197,94,0.1)':'rgba(245,158,11,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{r.s==='done'?'✅':'⏳'}</div>
                        <div><div style={{ fontSize:'0.8rem', fontWeight:600, textDecoration:r.s==='done'?'line-through':'none' }}>{r.t}</div><div style={{ fontSize:'0.65rem', color:'var(--text-3)' }}>Today • {r.time}</div></div>
                      </div>
                      <span style={{ fontSize:'0.6rem', fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--surface)', color:'var(--text-2)' }}>{r.p}</span>
                    </div>
                  ))}
                </div>
                {hlTarget==='recent' && <SectionTooltip sec={SECTIONS[1]} />}
              </div>

              {/* Quick Actions */}
              <div style={{ ...sty('actions'), borderRadius:16, borderWidth: hlTarget==='actions'?2:1, borderStyle:'solid', borderColor: hlTarget==='actions'?`${SECTIONS[2].accent}60`:'var(--border)', background:'var(--card-bg)', padding:16, overflow:'visible' }}>
                {hlTarget==='actions' && <div style={{ position:'absolute', inset:-6, borderRadius:22, background:`radial-gradient(ellipse, ${SECTIONS[2].accent}18, transparent 70%)`, zIndex:-1, animation:'mockPulseGlow 2s ease-in-out infinite' }} />}
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.9rem', marginBottom:12 }}>Quick Actions</h3>
                <div style={{ display:'grid', gap:8 }}>
                  {[{i:'✦',l:'AI Builder',a:'var(--orange)'},{i:'◉',l:'Analytics',a:'#f59e0b'},{i:'👥',l:'Team',a:'var(--green)'}].map((a,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, background:'var(--surface)', borderWidth:1, borderStyle:'solid', borderColor:'var(--border)' }}>
                      <span style={{ fontSize:14, color:a.a }}>{a.i}</span>
                      <span style={{ fontSize:'0.75rem', fontWeight:600 }}>{a.l}</span>
                    </div>
                  ))}
                </div>
                {hlTarget==='actions' && <SectionTooltip sec={SECTIONS[2]} />}
              </div>
            </div>

            {/* Modal */}
            {showModal && (
              <div style={{ position:'absolute', inset:0, zIndex:50, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', animation:'mockFadeIn 0.2s ease-out' }}>
                <div style={{ width:380, background:'var(--card-bg)', borderRadius:20, borderWidth:1, borderStyle:'solid', borderColor:'var(--border)', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', padding:24, animation:'mockScaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                    <h2 style={{ fontSize:'1.1rem', fontWeight:700, fontFamily:'var(--font-display)' }}>New Routine</h2>
                    <span style={{ color:'var(--text-3)', fontSize:18 }}>✕</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <div>
                      <div style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', marginBottom:6 }}>Routine Title</div>
                      <div ref={inputRef} style={{ background:'var(--surface)', borderWidth:1, borderStyle:'solid', borderColor:id==='typing'?'var(--orange)':'var(--border)', padding:'10px 14px', borderRadius:10, fontSize:'0.8rem', minHeight:38, display:'flex', alignItems:'center', transition:'border-color 0.2s' }}>
                        {typed}{(id==='typing'||id==='modal')&&<span style={{ display:'inline-block', width:2, height:14, background:'var(--orange)', marginLeft:2, animation:'mockBlink 1s infinite' }} />}
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <div>
                        <div style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', marginBottom:6 }}>Date</div>
                        <div style={{ background:'var(--surface)', borderWidth:1, borderStyle:'solid', borderColor:'var(--border)', padding:'10px 14px', borderRadius:10, fontSize:'0.8rem', color:'var(--text-2)' }}>Today</div>
                      </div>
                      <div style={{ position:'relative' }}>
                        <div style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', marginBottom:6 }}>Priority</div>
                        <div ref={priRef} style={{ background:'var(--surface)', borderWidth:1, borderStyle:'solid', borderColor:(id==='pri'||id==='dd')?'var(--orange)':'var(--border)', padding:'10px 14px', borderRadius:10, fontSize:'0.8rem', color:priSel?'var(--orange-2)':'var(--text-2)', transition:'all 0.2s' }}>
                          {priSel?'High':'Medium'}
                        </div>
                        {id==='dd'&&(
                          <div style={{ position:'absolute', top:'100%', left:0, width:'100%', background:'var(--bg)', borderWidth:1, borderStyle:'solid', borderColor:'var(--border)', borderRadius:8, marginTop:4, zIndex:10, boxShadow:'0 8px 24px rgba(0,0,0,0.2)', animation:'mockSlideIn 0.2s ease-out' }}>
                            <div style={{ padding:'8px 12px', fontSize:'0.8rem' }}>Low</div>
                            <div style={{ padding:'8px 12px', fontSize:'0.8rem' }}>Medium</div>
                            <div ref={ddHighRef} style={{ padding:'8px 12px', fontSize:'0.8rem', background:'var(--orange-light)', color:'var(--orange-2)', borderRadius:'0 0 8px 8px' }}>High</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div ref={createRef} style={{ marginTop:8, padding:12, borderRadius:12, textAlign:'center', background:'var(--orange)', color:'white', fontWeight:700, fontSize:'0.9rem', transform:id==='create'?'scale(0.96)':'scale(1)', opacity:id==='save'?0.7:1, transition:'all 0.15s' }}>
                      {id==='save'?'Creating...':'Create Routine'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={curStyle()}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <path d="M4 2.5L16.5 14L10.5 14.5L14 20.5L11 22L7.5 16L3.5 19.5V2.5Z" fill="black" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes mockFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes mockScaleIn { from{opacity:0;transform:scale(0.9) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes mockSlideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mockBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes mockDrawLine { from{stroke-dashoffset:200} to{stroke-dashoffset:0} }
        @keyframes mockTooltipIn { from{opacity:0;transform:translateY(10px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes mockPulseGlow { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
        @keyframes mockFloat0 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-15px) translateX(5px)} }
        @keyframes mockFloat1 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-10px) translateX(-8px)} }
        @keyframes mockFloat2 { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-20px) translateX(3px)} }
      `}</style>
    </div>
  );
}