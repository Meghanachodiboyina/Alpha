'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

const features = [
  { icon: "🧠", title: "AI Routine Builder", desc: "Describe your goals in plain language. Routinely's AI builds a complete optimized routine—instantly.", color: "#ff6b35", bg: "rgba(255,107,53,0.08)", pill: "Core" },
  { icon: "⏱️", title: "Focus Mode", desc: "Deep work sessions with built-in distraction blocking and smart break reminders.", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", pill: "Focus" },
  { icon: "👥", title: "Team Workspaces", desc: "Collaborate on shared routines and track team velocity without the meetings.", color: "#3b82f6", bg: "rgba(59,130,246,0.08)", pill: "Teams" },
  { icon: "📊", title: "Deep Analytics", desc: "Uncover patterns in your productivity. See exactly where your time goes each week.", color: "#10b981", bg: "rgba(16,185,129,0.08)", pill: "Trends" },
  { icon: "🎙️", title: "Voice Task Input", desc: "Capture tasks hands-free. Say it, and Routinely schedules it intelligently in your day.", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", pill: "Voice" },
  { icon: "🔄", title: "Smart Rescheduling", desc: "Life happens. Routinely dynamically reshuffles your day when you go off-track, keeping you on goal.", color: "#ec4899", bg: "rgba(236,72,153,0.08)", pill: "AI" },
];

const testimonials = [
  { name: "Sarah K.", role: "Product Lead @ Vercel", text: "Routinely cut our team's planning overhead by 60%. Every morning starts with a clear, AI-generated focus plan.", avatar: "SK" },
  { name: "Marcus L.", role: "Solo Founder", text: "I've tried every productivity app. Routinely is the first one that actually learns how I work and adapts.", avatar: "ML" },
  { name: "Elena V.", role: "Creative Director", text: "Finally, a routine builder that doesn't feel like a chore. The voice input is a game-changer.", avatar: "EV" },
];

const steps = [
  { num: "01", title: "Tell Routinely your goals", desc: "Type or speak your tasks, goals, or rough ideas. No rigid formats—just natural language." },
  { num: "02", title: "AI builds your routine", desc: "Routinely analyzes your workload, priorities, and energy patterns to create an optimal daily schedule." },
  { num: "03", title: "Execute with focus", desc: "Follow your AI-optimized plan and use Focus Mode to eliminate distractions and hit your peak." },
];

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
}

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkAndRedirect = () => {
      if (isMobileDevice()) {
        const user = localStorage.getItem('user');
        if (user) {
          router.replace('/dashboard');
          return;
        }
        const onboardingDone = localStorage.getItem('onboarding_done');
        if (onboardingDone) {
          router.replace('/login');
        } else {
          router.replace('/onboarding');
        }
        setReady(false);
        return;
      }
      setReady(true);
    };

    checkAndRedirect();
    window.addEventListener('resize', checkAndRedirect);
    return () => window.removeEventListener('resize', checkAndRedirect);
  }, [router]);

  // On mobile, show nothing while redirecting
  if (!ready) {
    return (
      <div style={{
        minHeight: '100dvh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, var(--orange), var(--orange-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse-ring 1.5s ease-in-out infinite',
        }}>
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <path d="M10 3L17 7v6l-7 4-7-4V7l7-4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <circle cx="10" cy="10" r="2" fill="white"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Navbar />

      {/* ─── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ paddingTop: "clamp(7rem, 14vw, 11rem)", paddingBottom: "clamp(5rem, 10vw, 9rem)" }}>
        <div className="orb orb-orange" style={{ width: 600, height: 600, top: -200, right: -200, opacity: 0.12 }} />
        <div className="orb orb-purple" style={{ width: 500, height: 500, bottom: -200, left: -200, opacity: 0.08 }} />

        <div className="container">
          <div className="flex flex-col items-center text-center" style={{ maxWidth: 820, marginInline: "auto" }}>
            <div className="pill pill-orange anim-fade-up mb-8" style={{ fontSize: "0.8rem" }}>
              <span>✦</span><span>AI-Powered Daily Planning — Build your future</span>
            </div>

            <h1 className="h1 anim-fade-up-delay-1" style={{ marginBottom: "1.5rem" }}>
              Your day, planned by{" "}
              <span style={{ background: "linear-gradient(135deg, var(--orange) 0%, var(--orange-2) 50%, #ffb347 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                intelligence
              </span>
            </h1>

            <p className="body-lg text-muted anim-fade-up-delay-2" style={{ maxWidth: 580, marginBottom: "2.5rem" }}>
              Routinely turns your messy thoughts into high-performance routines.
              Built for founders, creators, and teams who refuse to settle for less.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 anim-fade-up-delay-3">
              <Link href="/register" className="btn btn-primary btn-lg px-10">
                Get started for free
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3.75 9h10.5M9.75 4.5L14.25 9l-4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </div>


          </div>
          {/* ... Mockup part continues below ... */}

          {/* Dashboard Mockup */}
          <div className="anim-scale-in hero-mockup" style={{ marginTop: "5rem", maxWidth: 980, marginInline: "auto", position: "relative" }}>
            <div style={{ position: "absolute", inset: -40, background: "radial-gradient(ellipse at center, rgba(255,107,53,0.1) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(40px)", zIndex: 0 }} />
            <div style={{ position: "relative", zIndex: 1, background: "var(--bg-2)", border: "1px solid var(--border-strong)", borderRadius: 24, overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
              {/* Browser chrome */}
              <div style={{ background: "var(--bg-3)", borderBottom: "1px solid var(--border)", padding: "0.875rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
                </div>
                <div style={{ flex: 1, height: 28, background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--border)", display: "flex", alignItems: "center", paddingInline: "0.75rem", maxWidth: 300, marginInline: "auto" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>app.arc.ai/dashboard</span>
                </div>
              </div>

              {/* Dashboard Body */}
              <div className="hero-mockup-grid" style={{ display: "grid", gridTemplateColumns: "220px 1fr" }}>
                {/* Sidebar */}
                <div className="hero-mockup-sidebar" style={{ background: "var(--bg-2)", borderRight: "1px solid var(--border)", padding: "1.25rem 1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.5rem" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,var(--orange),var(--orange-2))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 3L17 7v6l-7 4-7-4V7l7-4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="10" cy="10" r="2" fill="white"/></svg>
                    </div>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>Routinely</span>
                  </div>
                  {[["⊞","Dashboard",true],["◷","My Routines",false],["✓","Tasks",false],["⊞","Projects",false],["👥","Team",false],["◉","Analytics",false]].map(([icon, label, active]) => (
                    <div key={String(label)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.625rem 0.75rem", borderRadius: 8, marginBottom: 2, background: active ? "var(--orange-light)" : "transparent", color: active ? "var(--orange-2)" : "var(--text-3)", fontSize: "0.8125rem", fontWeight: active ? 600 : 400 }}>
                      <span>{icon}</span><span>{label}</span>
                    </div>
                  ))}
                </div>

                {/* Main */}
                <div style={{ padding: "1.5rem", background: "var(--bg)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginBottom: 2 }}>Monday, 28 April</div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>Good morning, Alex 👋</div>
                    </div>
                    <div style={{ padding: "0.4rem 0.875rem", borderRadius: 20, background: "var(--orange)", color: "white", fontSize: "0.75rem", fontWeight: 600 }}>+ Add Task</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
                    {[["Focus Score","88%","+12%","var(--orange)"],["Tasks Done","14/18","Today","var(--green)"],["Deep Work","3h 20m","+45m","var(--purple)"]].map(([l,v,t,c]) => (
                      <div key={String(l)} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.875rem" }}>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-3)", marginBottom: 4 }}>{l}</div>
                        <div style={{ fontSize: "1.125rem", fontWeight: 700, color: String(c) }}>{v}</div>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-3)" }}>{t}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[["Q2 Roadmap Planning","09:00","Work","var(--orange)",true],["Design System Review","11:00","Design","var(--purple)",false],["Team Stand-up","13:00","Meeting","var(--blue)",false]].map(([l,time,tag,c,done]) => (
                      <div key={String(l)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.75rem 0.875rem", opacity: done ? 0.5 : 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${c}`, background: done ? String(c) : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {done && <span style={{ color: "white", fontSize: 9 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 500, textDecoration: done ? "line-through" : "none", color: done ? "var(--text-3)" : "var(--text)" }}>{l}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: "0.7rem", background: "var(--surface)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 20, color: "var(--text-3)" }}>{tag}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>{time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ───────────────────────────────────────── */}
      <section id="features" className="section">
        <div className="container">
          <div className="text-center" style={{ maxWidth: 600, marginInline: "auto", marginBottom: "4rem" }}>
            <div className="pill pill-orange mb-6" style={{ display: "inline-flex" }}>Platform Features</div>
            <h2 className="h2" style={{ marginBottom: "1rem" }}>Everything you need to perform at your best</h2>
            <p className="body-lg text-muted">A complete productivity OS for individuals and teams.</p>
          </div>
          <div className="platform-features-grid">
            {features.map((f, i) => (
              <div key={i} className="card card-hover p-8">
                <div className="feature-icon-wrap" style={{ background: f.bg }}>
                  <span style={{ fontSize: "1.75rem" }}>{f.icon}</span>
                </div>
                <div className="pill mb-4" style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem", background: f.bg, color: f.color, border: "none", display: "inline-flex" }}>{f.pill}</div>
                <h3 className="h4 mb-3">{f.title}</h3>
                <p className="body-sm text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────── */}
      <section id="how" className="section" style={{ background: "var(--bg-2)" }}>
        <div className="container">
          <div className="text-center" style={{ maxWidth: 600, marginInline: "auto", marginBottom: "4rem" }}>
            <div className="pill pill-purple mb-6" style={{ display: "inline-flex" }}>How it works</div>
            <h2 className="h2" style={{ marginBottom: "1rem" }}>From chaos to clarity in three steps</h2>
          </div>
          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "2rem" }}>
            {steps.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--orange-light)", border: "1px solid rgba(255,107,53,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginInline: "auto", marginBottom: "1.5rem", fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--orange)" }}>{s.num}</div>
                <h3 className="h4 mb-3">{s.title}</h3>
                <p className="body-sm text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ─── FINAL CTA ─── */}
      <section className="section" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div className="card text-center cta-section" style={{ maxWidth: 800, marginInline: 'auto', padding: '4rem 2rem', background: 'var(--bg-2)', position: 'relative', overflow: 'hidden' }}>
            <div className="orb orb-orange" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 300, height: 300, opacity: 0.1 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 className="h2 mb-4">Ready to take back your time?</h2>
              <p className="body-lg text-muted mb-8" style={{ maxWidth: 500, marginInline: 'auto' }}>
                Join thousands of high-performers who use Routinely to stay focused and productive.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/register" className="btn btn-primary btn-lg">Start your journey</Link>
                <Link href="/login" className="btn btn-ghost btn-lg">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
