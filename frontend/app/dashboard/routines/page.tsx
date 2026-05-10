'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  useEffect(() => { fetchRoutines(); }, []);

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const res = await api.get('/routines');
      setRoutines(res.data.sort((a: any, b: any) =>
        a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || '')
      ));
    } catch { setError('Failed to load routines.'); }
    finally { setLoading(false); }
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
      setSuccess('Routine created!');
      setTimeout(() => setSuccess(''), 3000);
      fetchRoutines(); 
    } catch (err) {
      console.error('Failed to create routine:', err);
      setError('Failed to create routine.');
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (routine: any) => {
    const newStatus = routine.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await api.put(`/routines/${routine.id}`, { ...routine, status: newStatus });
      setRoutines(routines.map(r => r.id === routine.id ? { ...r, status: newStatus } : r));
    } catch { setError('Failed to update status.'); }
  };

  const deleteRoutine = async (id: number) => {
    if (!confirm('Delete this routine?')) return;
    try {
      await api.delete(`/routines/${id}`);
      setRoutines(routines.filter(r => r.id !== id));
      setSuccess('Routine deleted.'); setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Failed to delete routine.'); }
  };

  if (loading && routines.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--orange)', animation: 'spin-slow 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeUp 0.5s var(--ease-out) both' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>My Routines</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>Manage and track your scheduled activities.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 12, fontSize: '0.875rem', fontWeight: 600,
              background: 'var(--orange)', color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 16px var(--orange-glow)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'none'}
          >
            + New Routine
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.875rem', fontWeight: 500 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'var(--green)', fontSize: '0.875rem', fontWeight: 500 }}>
          {success}
        </div>
      )}

      {/* Routines List */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {routines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No routines yet</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: 24 }}>Start by planning your day using the AI routine builder.</p>
            <Link href="/dashboard/ai" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem',
              background: 'var(--orange)', color: '#fff', textDecoration: 'none',
              boxShadow: '0 4px 16px var(--orange-glow)',
            }}>✦ Build with AI</Link>
          </div>
        ) : routines.map((r, i) => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            padding: '16px 20px', gap: 16,
            borderBottom: i < routines.length - 1 ? '1px solid var(--border)' : 'none',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            {/* Status toggle */}
            <button
              onClick={() => toggleStatus(r)}
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0, cursor: 'pointer', border: 'none',
                background: r.status === 'Completed' ? 'rgba(34,197,94,0.15)' : 'var(--surface)',
                color: r.status === 'Completed' ? 'var(--green)' : 'var(--text-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                transition: 'all 0.2s',
              }}
            >
              {r.status === 'Completed' ? '✅' : '○'}
            </button>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)',
                marginBottom: 4,
                textDecoration: r.status === 'Completed' ? 'line-through' : 'none',
                opacity: r.status === 'Completed' ? 0.5 : 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{r.title}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600 }}>
                <span>📅 {r.date}</span>
                {r.start_time && <span>🕐 {r.start_time} – {r.end_time}</span>}
                {r.estimated_time && <span>⏱ {r.estimated_time}min</span>}
              </div>
              {r.suggestion && (
                <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--orange-2)', fontStyle: 'italic' }}>
                  ✦ {r.suggestion}
                </div>
              )}
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                color: r.priority === 'High' ? '#ef4444' : r.priority === 'Low' ? 'var(--green)' : '#f59e0b',
                background: r.priority === 'High' ? 'rgba(239,68,68,0.12)' : r.priority === 'Low' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
              }}>{r.priority}</span>
              <button
                onClick={() => deleteRoutine(r.id)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
              >🗑</button>
            </div>
          </div>
        ))}
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
