'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { deleteCookie, getCookie } from 'cookies-next';
import api from '@/lib/api';

const navItems = [
  { icon: '⊞', label: 'Overview', href: '/dashboard' },
  { icon: '◷', label: 'My Routines', href: '/dashboard/routines' },
  { icon: '✓', label: 'Tasks', href: '/dashboard/tasks' },
  { icon: '◈', label: 'Projects', href: '/dashboard/projects' },
  { icon: '👥', label: 'Team', href: '/dashboard/team' },
  { icon: '◉', label: 'Analytics', href: '/dashboard/analytics' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ routines: any[]; tasks: any[] }>({ routines: [], tasks: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (searchQuery.length === 0) {
      setSearchResults({ routines: [], tasks: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data);
      } catch {
        setSearchResults({ routines: [], tasks: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Ensure sidebar is expanded when mobile menu is opened
  useEffect(() => {
    if (mobileOpen) {
      setCollapsed(false);
    }
  }, [mobileOpen]);

  // Session check
  useEffect(() => {
    const token = getCookie('auth_token');
    if (!token) {
      router.push('/login');
    }
  }, [router, pathname]);

  useEffect(() => {
    fetchNotifications();
  }, [pathname]);

  const fetchNotifications = async () => {
    try {
      let notifs = [
        { id: 1, type: 'system', title: 'System Update', message: 'Routinely 2.0 is live with complete mobile optimization!', read: false, time: '2h ago' },
      ];

      try {
        const res = await api.get('/routines');
        const todayRoutines = res.data.filter((r: any) => r.status === 'Pending' && r.date === new Date().toISOString().split('T')[0]);
        if (todayRoutines.length > 0) {
          notifs.push({ id: 2, type: 'alert', title: 'Upcoming Routines', message: `You have ${todayRoutines.length} pending routines scheduled for today.`, read: false, time: 'Just now' });
        }
      } catch { }

      try {
        const taskRes = await api.get('/workspace/tasks');
        const pendingTasks = taskRes.data.filter((t: any) => t.status !== 'Done');
        if (pendingTasks.length > 0) {
          notifs.push({ id: 3, type: 'task', title: 'Task Deadline Approaching', message: `You have ${pendingTasks.length} pending tasks in your workspace.`, read: false, time: '1h ago' });
        }
      } catch { }

      const readIds = JSON.parse(localStorage.getItem('readNotifs') || '[]');
      const deletedIds = JSON.parse(localStorage.getItem('deletedNotifs') || '[]');
      notifs = notifs.filter(n => !deletedIds.includes(n.id)).map(n => ({ ...n, read: readIds.includes(n.id) }));
      setNotifications(notifs);
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = () => {
    const ids = notifications.map(n => n.id);
    const existing = JSON.parse(localStorage.getItem('readNotifs') || '[]');
    localStorage.setItem('readNotifs', JSON.stringify([...new Set([...existing, ...ids])]));
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const deletedIds = JSON.parse(localStorage.getItem('deletedNotifs') || '[]');
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('deletedNotifs', JSON.stringify(deletedIds));
    }
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Inactivity Logout Logic
  const INACTIVITY_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days

  const handleLogout = useCallback(() => {
    deleteCookie('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('arc_theme');
    document.documentElement.setAttribute('data-theme', 'dark');
    router.push('/');
  }, [router]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    // Initialize timer
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [handleLogout]);

  useEffect(() => {
    const saved = localStorage.getItem('arc_theme') as 'dark' | 'light' | null;
    const t = saved || 'dark';
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    } catch { }
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('arc_theme', next);
  }, [theme]);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'R'; // Updated from 'A' to 'R' for Routinely

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s' }}>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 72 : 240,
        minHeight: '100vh',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
        transition: 'width 0.25s var(--ease-out)',
        overflow: 'hidden',
      }}
        className={`dash-sidebar${mobileOpen ? ' mobile-open' : ''}`}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 16px' : '0 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {!collapsed && (
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'linear-gradient(135deg, var(--orange), var(--orange-2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px var(--orange-glow)', flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3L17 7v6l-7 4-7-4V7l7-4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="10" cy="10" r="2" fill="white" />
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--text)' }}>Routinely</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--orange), var(--orange-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px var(--orange-glow)',
              textDecoration: 'none',
            }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M10 3L17 7v6l-7 4-7-4V7l7-4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="10" cy="10" r="2" fill="white" />
              </svg>
            </Link>
          )}
          {!collapsed && (
            <button onClick={() => { 
              if (window.innerWidth <= 768) {
                setMobileOpen(false);
              } else {
                setCollapsed(true);
              }
            }} style={{
              width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {collapsed && (
            <button onClick={() => setCollapsed(false)} style={{
              position: 'absolute', top: 18, right: -12, width: 24, height: 24,
              border: '1px solid var(--border)', borderRadius: 6,
              background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow)',
            }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {/* AI Builder highlight */}
        <div style={{ padding: collapsed ? '12px 10px' : '12px 12px', flexShrink: 0 }}>
          <Link href="/dashboard/ai" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '10px 0' : '10px 12px', justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 12,
            background: 'linear-gradient(135deg, var(--orange-light), rgba(139,92,246,0.08))',
            border: '1px solid rgba(255,107,53,0.2)',
            textDecoration: 'none',
          }}>
            <span style={{ fontSize: 18 }}>✦</span>
            {!collapsed && (
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--orange-2)' }}>AI Builder</span>
            )}
          </Link>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: collapsed ? '4px 10px' : '4px 12px', overflowY: 'auto' }}>
          {!collapsed && (
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 12 }}>
              Workspace
            </div>
          )}
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '10px 0' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 10, marginBottom: 2, textDecoration: 'none',
                background: active ? 'var(--orange-light)' : 'transparent',
                color: active ? 'var(--orange-2)' : 'var(--text-2)',
                fontWeight: active ? 600 : 400,
                fontSize: '0.875rem',
                transition: 'all 0.15s',
                borderLeft: active ? '3px solid var(--orange)' : '3px solid transparent',
              }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; } }}
                title={collapsed ? item.label : undefined}
              >
                <span style={{ fontSize: 17, flexShrink: 0, width: 20, textAlign: 'center' }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User avatar actionable */}
        <div style={{ padding: collapsed ? '8px 10px' : '8px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ position: 'relative', marginTop: 4 }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%', border: 'none', background: 'none',
                cursor: 'pointer', borderRadius: 12,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--orange), var(--purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0,
                boxShadow: '0 2px 8px var(--orange-glow)',
              }}>{initials}</div>
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'View Profile'}</div>
                </div>
              )}
              {!collapsed && (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.5 }}>
                  <path d="M3 5l4 4 4-4" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <div style={{
                position: 'absolute', bottom: '100%', left: collapsed ? 60 : 12, right: collapsed ? 'auto' : 12,
                marginBottom: 8, background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 100,
                overflow: 'hidden', width: collapsed ? 180 : 'auto',
                animation: 'fadeUp 0.2s var(--ease-out)',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)' }}>{user?.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{user?.email}</div>
                </div>
                <div style={{ padding: 4 }}>
                  <Link href="/dashboard/settings" onClick={() => setUserMenuOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 8, textDecoration: 'none', color: 'var(--text-2)',
                    fontSize: '0.8125rem', transition: 'background 0.2s',
                  }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
                    <span>⚙</span> Settings
                  </Link>
                  <Link href="/dashboard/billing" onClick={() => setUserMenuOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 8, textDecoration: 'none', color: 'var(--text-2)',
                    fontSize: '0.8125rem', transition: 'background 0.2s',
                  }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
                    <span>💳</span> Billing
                  </Link>
                  <button onClick={handleLogout} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer',
                    width: '100%', textAlign: 'left', color: '#ef4444',
                    fontSize: '0.8125rem', transition: 'background 0.2s',
                  }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
                    <span>👋</span> Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="dash-main" style={{
        marginLeft: collapsed ? 72 : 240,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        transition: 'margin-left 0.25s var(--ease-out)',
      }}>

        {/* ── Top Header ── */}
        <header className="dash-header" style={{
          height: 64,
          background: 'var(--header-bg)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(16px)',
          position: 'sticky', top: 0, zIndex: 40,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          gap: 16,
          flexShrink: 0,
        }}>
          {/* Mobile hamburger */}
          <button
            className="dash-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text)', cursor: 'pointer',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>

          {/* Left spacer for symmetry */}
          <div className="dash-header-spacer" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          </div>

          {/* Search (Centered) */}
          <div className="dash-header-search" style={{ flex: 1, maxWidth: 460, position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              placeholder="Search routines, tasks..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => { if (searchQuery.length > 0) setSearchOpen(true); }}
              onBlur={() => { setTimeout(() => setSearchOpen(false), 200); }}
              style={{
                width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '8px 12px 8px 36px',
                color: 'var(--text)', fontSize: '0.875rem', outline: 'none',
                transition: 'all 0.2s',
              }}
            />
            {searchOpen && searchQuery.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: 14, padding: 6, zIndex: 100,
                boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                maxHeight: 320, overflowY: 'auto',
              }}>
                {searchLoading ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem' }}>Searching...</div>
                ) : searchResults.routines.length === 0 && searchResults.tasks.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem' }}>No results found</div>
                ) : (
                  <>
                    {searchResults.routines.length > 0 && (
                      <>
                        <div style={{ padding: '6px 10px', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Routines</div>
                        {searchResults.routines.map((r: any) => (
                          <a key={`r-${r.id}`} href="/dashboard/routines"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                              borderRadius: 8, textDecoration: 'none', color: 'var(--text)',
                              fontSize: '0.84rem', transition: 'background 0.15s', cursor: 'pointer',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            <span style={{ fontSize: 14 }}>{r.status === 'Completed' ? '✅' : '📅'}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{r.date}</span>
                          </a>
                        ))}
                      </>
                    )}
                    {searchResults.tasks.length > 0 && (
                      <>
                        <div style={{ padding: '6px 10px', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: searchResults.routines.length > 0 ? 4 : 0 }}>Tasks</div>
                        {searchResults.tasks.map((t: any) => (
                          <a key={`t-${t.id}`} href="/dashboard/tasks"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                              borderRadius: 8, textDecoration: 'none', color: 'var(--text)',
                              fontSize: '0.84rem', transition: 'background 0.15s', cursor: 'pointer',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            <span style={{ fontSize: 14 }}>✓</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', background: 'var(--surface)', padding: '2px 6px', borderRadius: 6 }}>{t.project_name}</span>
                          </a>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="dash-header-actions" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text-2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
            >
              {theme === 'dark' ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setNotificationsOpen(!notificationsOpen); setUserMenuOpen(false); }}
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: notificationsOpen ? 'var(--surface)' : 'transparent',
                  border: '1px solid var(--border)',
                  color: notificationsOpen ? 'var(--text)' : 'var(--text-2)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = notificationsOpen ? 'var(--text)' : 'var(--text-2)'; }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                    background: 'var(--orange)', color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid var(--header-bg)',
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {notificationsOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  width: 340, background: 'var(--card-bg)', border: '1px solid var(--border)',
                  borderRadius: 16, boxShadow: 'var(--shadow-lg)', zIndex: 100,
                  overflow: 'hidden', animation: 'fadeUp 0.2s var(--ease-out)',
                }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)' }}>Notifications</div>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: 'var(--orange)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem' }}>
                        No notifications yet.
                      </div>
                    ) : notifications.map(notif => (
                      <div key={notif.id} style={{
                        padding: '16px', borderBottom: '1px solid var(--border)',
                        background: notif.read ? 'transparent' : 'rgba(255,107,53,0.03)',
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: notif.type === 'alert' ? 'rgba(239,68,68,0.1)' : notif.type === 'task' ? 'rgba(34,197,94,0.1)' : 'var(--surface)',
                          color: notif.type === 'alert' ? '#ef4444' : notif.type === 'task' ? 'var(--green)' : 'var(--orange)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
                        }}>
                          {notif.type === 'alert' ? '⏰' : notif.type === 'task' ? '✓' : '🚀'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{notif.title}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{notif.time}</div>
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                            {notif.message}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={(e) => deleteNotification(notif.id, e)}
                            style={{
                              background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer',
                              padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: '50%', transition: 'all 0.2s', width: 20, height: 20
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
                            title="Delete notification"
                          >
                            ✕
                          </button>
                          {!notif.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--orange)' }} />}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-3)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                    <button style={{ background: 'none', border: 'none', fontSize: '0.8125rem', color: 'var(--text-2)', cursor: 'pointer', fontWeight: 600 }}>
                      View all history
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="dash-content" style={{ flex: 1, padding: 28, maxWidth: 1280, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
