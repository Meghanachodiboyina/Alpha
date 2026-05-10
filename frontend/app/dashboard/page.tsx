'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoutine, setNewRoutine] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    priority: 'Medium',
    category: 'Work'
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    } catch {}
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, routinesRes] = await Promise.all([
        api.get('/dashboard/stats?weeks=3'),
        api.get('/routines'),
      ]);
      setStats(statsRes.data);
      setRoutines(routinesRes.data.slice(0, 6));
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      if (err.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/routines', newRoutine);
      setShowCreateModal(false);
      setNewRoutine({
        title: '',
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '10:00',
        priority: 'Medium',
        category: 'Work'
      });
      fetchData(); // Refresh list
    } catch (err) {
      console.error('Failed to create routine:', err);
    } finally {
      setCreating(false);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const productivity = stats?.productivity_score ?? 0;
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekly = stats?.weekly_overview ?? [];

  // Group data into weeks of 7 days
  const weeks: { label: string; bars: { date: string; count: number }[] }[] = [];
  for (let i = 0; i < weekly.length; i += 7) {
    const chunk = weekly.slice(i, i + 7);
    if (chunk.length > 0) {
      const startDate = new Date(chunk[0].date);
      const endDate = new Date(chunk[chunk.length - 1].date);
      const today = new Date();
      const startOfCurrentWeek = new Date(today);
      startOfCurrentWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
      const isCurrentWeek = startDate.toISOString().slice(0, 10) === startOfCurrentWeek.toISOString().slice(0, 10);
      const label = isCurrentWeek
        ? 'This Week'
        : `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      weeks.push({ label, bars: chunk });
    }
  }
  const allCounts = weekly.map((d: any) => d.count ?? 0);
  const barMax = Math.max(...allCounts, 1);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          border: '3px solid var(--border)', borderTopColor: 'var(--orange)',
          animation: 'spin-slow 0.8s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, animation: 'fadeUp 0.5s var(--ease-out) both' }}>

      {/* Greeting + Actions */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {greeting}, {firstName} 👋
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 12, fontSize: '0.875rem', fontWeight: 600,
              border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
          >
            + New Routine
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="dash-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'Total Routines', value: stats?.total_routines ?? 0, icon: '📅', accent: 'var(--orange)' },
          { label: 'Completed', value: stats?.completed_routines ?? 0, icon: '✅', accent: 'var(--green)', delta: '+today' },
          { label: 'Pending', value: stats?.pending_routines ?? 0, icon: '⏳', accent: '#f59e0b' },
          { label: 'Productivity', value: `${productivity}%`, icon: '⚡', accent: 'var(--blue)' },
        ].map((card, i) => (
          <div key={i} className="dash-stat-card" style={{
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 24,
            display: 'flex', flexDirection: 'column', gap: 16,
            transition: 'all 0.25s', boxShadow: 'var(--shadow)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.borderColor = card.accent; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13,
                background: `${card.accent}18`, border: `1px solid ${card.accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>{card.icon}</div>
              {card.delta && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: `${card.accent}15`, color: card.accent }}>
                  {card.delta}
                </span>
              )}
            </div>
            <div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text)', letterSpacing: '-0.02em' }}>{card.value}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginTop: 2 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="dash-main-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>

        {/* Recent Routines */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>Recent Routines</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>Your latest scheduled items</p>
            </div>
            <Link href="/dashboard/routines" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--orange)', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ padding: '8px 12px' }}>
            {routines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                <p style={{ fontSize: '0.875rem' }}>No routines yet. Let AI build your first one!</p>
              </div>
            ) : routines.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 12, gap: 12, transition: 'background 0.15s', cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    background: r.status === 'Completed' ? 'rgba(34,197,94,0.12)' : 'rgba(255,107,53,0.10)',
                  }}>
                    {r.status === 'Completed' ? '✅' : '⏳'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textDecoration: r.status === 'Completed' ? 'line-through' : 'none',
                      opacity: r.status === 'Completed' ? 0.5 : 1,
                    }}>{r.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 1 }}>
                      {r.date}{r.start_time ? ` • ${r.start_time}` : ''}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                  color: r.priority === 'High' ? '#ef4444' : r.priority === 'Low' ? 'var(--green)' : '#f59e0b',
                  background: r.priority === 'High' ? 'rgba(239,68,68,0.12)' : r.priority === 'Low' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                }}>
                  {r.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Chart + Productivity Ring */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>Weekly Overview</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>Swipe right for past weeks</p>
            </div>
            <span style={{ padding: '5px 12px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, background: 'var(--orange-light)', color: 'var(--orange-2)', border: '1px solid rgba(255,107,53,0.2)' }}>
              {weeks.length} week{weeks.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Scrollable chart container */}
          <div
            ref={(el) => { if (el) el.scrollLeft = el.scrollWidth; }}
            style={{
              display: 'flex', gap: 24, overflowX: 'auto',
              scrollSnapType: 'x mandatory', scrollBehavior: 'smooth',
              paddingBottom: 8, marginBottom: 8,
              scrollbarWidth: 'thin',
            }}
          >
            {weeks.map((week, wi) => (
              <div key={wi} style={{
                minWidth: 240, flex: '0 0 auto',
                scrollSnapAlign: 'end',
              }}>
                <div style={{
                  fontSize: '0.72rem', fontWeight: 700, color: week.label === 'This Week' ? 'var(--orange)' : 'var(--text-3)',
                  marginBottom: 8, textAlign: 'center',
                  padding: '3px 10px', borderRadius: 6,
                  background: week.label === 'This Week' ? 'var(--orange-light)' : 'transparent',
                  display: 'inline-block', width: '100%',
                }}>
                  {week.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
                  {week.bars.map((bar, bi) => (
                    <div key={bi} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{
                        width: '100%', borderRadius: '5px 5px 0 0',
                        height: `${(bar.count / barMax) * 100}%`, minHeight: 4,
                        background: week.label === 'This Week'
                          ? 'linear-gradient(180deg, var(--orange) 0%, var(--orange-2) 100%)'
                          : 'linear-gradient(180deg, var(--text-3) 0%, var(--border-strong) 100%)',
                        opacity: bar.count === 0 ? 0.2 : 1, transition: 'height 0.4s var(--ease-out)',
                        position: 'relative',
                      }}>
                        {bar.count > 0 && (
                          <div style={{
                            position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                            fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-2)', whiteSpace: 'nowrap',
                          }}>{bar.count}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {dayLabels.map(d => (
                    <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600 }}>{d}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
              <svg width="60" height="60" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="24" fill="none" stroke="var(--border)" strokeWidth="5"/>
                <circle cx="30" cy="30" r="24" fill="none" stroke="var(--orange)" strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - productivity / 100)}`}
                  style={{ transformOrigin: 'center', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 0.6s var(--ease-out)' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)' }}>
                {productivity}%
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>Productivity Score</div>
              <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: 2 }}>
                {productivity >= 70 ? '🔥 You\'re on fire!' : productivity >= 40 ? '💪 Keep going!' : '🌱 Build the habit!'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 4 }}>Quick Actions</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 20 }}>Jump to key features</p>
          <div className="dash-actions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '✦', label: 'AI Builder', href: '/dashboard/ai', accent: 'var(--orange)' },
              { icon: '📅', label: 'My Routines', href: '/dashboard/routines', accent: 'var(--purple)' },
              { icon: '✓', label: 'Tasks', href: '/dashboard/tasks', accent: 'var(--blue)' },
              { icon: '👥', label: 'Team', href: '/dashboard/team', accent: 'var(--green)' },
              { icon: '◉', label: 'Analytics', href: '/dashboard/analytics', accent: '#f59e0b' },
              { icon: '◈', label: 'Projects', href: '/dashboard/projects', accent: '#ec4899' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 14,
                background: 'var(--surface)', border: '1px solid var(--border)',
                textDecoration: 'none', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = a.accent; el.style.background = `${a.accent}10`; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.background = 'var(--surface)'; }}
              >
                <span style={{ fontSize: 18, color: a.accent }}>{a.icon}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
    
    {/* Create Routine Modal */}
    {showCreateModal && (
      <div className="modal-backdrop" style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        padding: 20
      }}>
        <div className="modal-content" style={{
          width: '100%', maxWidth: 480, background: 'var(--card-bg)',
          borderRadius: 24, border: '1px solid var(--border)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)', overflow: 'hidden',
          animation: 'fadeUp 0.3s var(--ease-out)'
        }}>
          <div className="modal-header" style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>New Routine</h2>
            <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>
          <form onSubmit={handleCreateRoutine} className="modal-body" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 8 }}>Routine Title</label>
                <input 
                  autoFocus required
                  placeholder="e.g. Morning Workout"
                  value={newRoutine.title}
                  onChange={e => setNewRoutine({...newRoutine, title: e.target.value})}
                  style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', color: 'var(--text)', outline: 'none' }}
                />
              </div>
              
              <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 8 }}>Date</label>
                  <input 
                    type="date" required
                    value={newRoutine.date}
                    onChange={e => setNewRoutine({...newRoutine, date: e.target.value})}
                    style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 8 }}>Priority</label>
                  <select 
                    value={newRoutine.priority}
                    onChange={e => setNewRoutine({...newRoutine, priority: e.target.value})}
                    style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', color: 'var(--text)', outline: 'none' }}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>

              <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 8 }}>Start Time</label>
                  <input 
                    type="time" required
                    value={newRoutine.start_time}
                    onChange={e => setNewRoutine({...newRoutine, start_time: e.target.value})}
                    style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 8 }}>End Time</label>
                  <input 
                    type="time" required
                    value={newRoutine.end_time}
                    onChange={e => setNewRoutine({...newRoutine, end_time: e.target.value})}
                    style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <button 
                  type="submit"
                  disabled={creating}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                    background: 'var(--orange)', color: 'white', fontWeight: 700, fontSize: '1rem',
                    cursor: 'pointer', boxShadow: '0 8px 24px var(--orange-glow)',
                    opacity: creating ? 0.7 : 1, transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'none'}
                >
                  {creating ? 'Creating...' : 'Create Routine'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
