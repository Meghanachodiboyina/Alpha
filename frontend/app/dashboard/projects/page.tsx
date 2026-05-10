'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workspace/projects');
      setProjects(res.data);
    } catch { setError('Failed to load projects.'); }
    finally { setLoading(false); }
  };

  const deleteProject = async (id: number) => {
    if (!confirm('Delete this project?')) return;
    try {
      await api.delete(`/workspace/projects/${id}`);
      setProjects(projects.filter(p => p.id !== id));
    } catch { setError('Cannot delete the default Team Space or this project.'); }
  };

  if (loading && projects.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--orange)', animation: 'spin-slow 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeUp 0.5s var(--ease-out) both' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>Projects</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>Organize your workspace into focused projects.</p>
        </div>
      </div>

      {error && <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.875rem', fontWeight: 500 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {projects.map(project => (
          <div key={project.id} style={{
            background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 20,
            overflow: 'hidden', boxShadow: 'var(--shadow)', transition: 'all 0.25s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'; }}
          >
            {/* Color bar */}
            <div style={{ height: 4, background: project.color || 'var(--orange)' }} />
            <div style={{ padding: '20px 20px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${project.color || 'var(--orange)'}18`,
                  border: `1px solid ${project.color || 'var(--orange)'}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>◈</div>
                <button
                  onClick={() => deleteProject(project.id)}
                  style={{
                    width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                >🗑</button>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text)', marginBottom: 6 }}>{project.name}</h3>
              {project.description && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                  {project.description}
                </p>
              )}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600 }}>
                👥 Workspace project
              </div>
            </div>
          </div>
        ))}

        {/* Add new placeholder */}
        <div style={{
          background: 'var(--surface)', border: '1px dashed var(--border-strong)', borderRadius: 20,
          padding: 24, minHeight: 160,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
          gap: 10,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--orange)'; (e.currentTarget as HTMLElement).style.background = 'var(--orange-light)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; }}
        >
          <span style={{ fontSize: 28, color: 'var(--text-3)' }}>＋</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-3)' }}>Create New Project</span>
        </div>
      </div>
    </div>
  );
}
