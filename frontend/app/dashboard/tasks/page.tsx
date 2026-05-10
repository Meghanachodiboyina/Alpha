'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workspace/tasks');
      setTasks(res.data);
    } catch { setError('Failed to load tasks.'); }
    finally { setLoading(false); }
  };

  const updateStatus = async (task: any, newStatus: string) => {
    try {
      await api.put(`/workspace/tasks/${task.id}`, { ...task, status: newStatus });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch { setError('Failed to update task.'); }
  };

  const deleteTask = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/workspace/tasks/${id}`);
      setTasks(tasks.filter(t => t.id !== id));
      setSuccess('Task deleted.'); setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Failed to delete task.'); }
  };

  const tabs = ['All', 'Todo', 'Doing', 'Done'];
  const filtered = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);

  if (loading && tasks.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--orange)', animation: 'spin-slow 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeUp 0.5s var(--ease-out) both' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>Tasks</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>Manage your workspace tasks and deadlines.</p>
        </div>
      </div>

      {/* Tab filters */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setFilter(tab)} style={{
            padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontSize: '0.8125rem', fontWeight: 700,
            background: filter === tab ? 'var(--card-bg)' : 'transparent',
            color: filter === tab ? 'var(--text)' : 'var(--text-3)',
            transition: 'all 0.2s',
            boxShadow: filter === tab ? 'var(--shadow)' : 'none',
          }}>
            {tab}
            <span style={{ marginLeft: 6, fontSize: '0.65rem', opacity: 0.6 }}>
              {tasks.filter(t => tab === 'All' ? true : t.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.875rem', fontWeight: 500 }}>{error}</div>}
      {success && <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'var(--green)', fontSize: '0.875rem', fontWeight: 500 }}>{success}</div>}

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 20, textAlign: 'center', padding: '60px 24px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>All clear!</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>No tasks in this category.</p>
          </div>
        ) : filtered.map(task => (
          <div key={task.id} style={{
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '16px 20px',
            display: 'flex', alignItems: 'flex-start', gap: 16,
            transition: 'all 0.2s', boxShadow: 'var(--shadow)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            {/* Status button */}
            <button
              onClick={() => updateStatus(task, task.status === 'Done' ? 'Todo' : 'Done')}
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0, border: 'none',
                background: task.status === 'Done' ? 'rgba(34,197,94,0.15)' : 'var(--surface)',
                color: task.status === 'Done' ? 'var(--green)' : 'var(--text-3)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                transition: 'all 0.2s',
              }}
            >
              {task.status === 'Done' ? '✅' : '○'}
            </button>

            {/* Task info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6,
                textDecoration: task.status === 'Done' ? 'line-through' : 'none',
                opacity: task.status === 'Done' ? 0.5 : 1,
              }}>{task.title}</div>
              {task.description && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600 }}>
                <span style={{ background: 'var(--surface)', padding: '3px 8px', borderRadius: 8 }}>◈ {task.project_name}</span>
                <span>📅 {task.due_date}</span>
                <span>👤 {task.assignee}</span>
                {task.progress != null && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 60, height: 4, borderRadius: 99, background: 'var(--border)', display: 'inline-block', overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${task.progress}%`, background: 'var(--orange)', borderRadius: 99 }} />
                    </span>
                    {task.progress}%
                  </span>
                )}
              </div>
            </div>

            {/* Priority + actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                color: task.priority === 'High' ? '#ef4444' : task.priority === 'Low' ? 'var(--green)' : '#f59e0b',
                background: task.priority === 'High' ? 'rgba(239,68,68,0.12)' : task.priority === 'Low' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
              }}>{task.priority}</span>
              <button
                onClick={() => deleteTask(task.id)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
              >🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
