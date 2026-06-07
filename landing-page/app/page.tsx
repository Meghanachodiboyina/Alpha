'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import AnimatedDashboardMockup from "@/components/AnimatedDashboardMockup";
import USPShowcase from "@/components/USPShowcase";

const features = [
  { icon: "🧠", title: "AI Routine Builder", desc: "Describe your goals in plain language. Routinely's AI builds a complete optimized routine—instantly.", color: "#ff6b35", bg: "rgba(255,107,53,0.08)", pill: "Core" },
  { icon: "🎯", title: "Goal Tracking", desc: "Break down long-term projects into daily routines and milestones that track your velocity.", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", pill: "Goals" },
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
  { num: "03", title: "Execute with clarity", desc: "Follow your AI-optimized plan to eliminate daily friction, finish tasks, and hit your peak." },
];

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
}

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  // Parallax mouse tracking
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setMx((e.clientX - w/2) / w);  // -0.5 to 0.5
      setMy((e.clientY - h/2) / h);
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768);
    setReady(true);
  }, []);

  const scrollToDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("download");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.routinely.app";

  // Render a loading ring briefly on mount
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
      <section ref={heroRef} className="relative overflow-hidden" style={{ paddingTop: "clamp(7rem, 14vw, 11rem)", paddingBottom: "clamp(5rem, 10vw, 9rem)" }}>
        <div className="orb orb-orange" style={{ width: 600, height: 600, top: -200, right: -200, opacity: 0.12, transform: `translate(${mx*-30}px, ${my*-20}px)`, transition: 'transform 0.3s ease-out' }} />
        <div className="orb orb-purple" style={{ width: 500, height: 500, bottom: -200, left: -200, opacity: 0.08, transform: `translate(${mx*20}px, ${my*15}px)`, transition: 'transform 0.3s ease-out' }} />

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
              Built for founders and creators who refuse to settle for less.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 anim-fade-up-delay-3">
              {isMobile ? (
                <a href={playStoreUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg px-8" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', borderRadius: 'var(--r-full)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.25 3.25L13.5 12L3.25 20.75C3.1 20.5 3 20.15 3 19.75V4.25C3 3.85 3.1 3.5 3.25 3.25Z" fill="#00C0FF"/>
                    <path d="M17.5 8.5L13.5 12L17.5 15.5L21.25 13.25C21.75 13 22 12.5 22 12C22 11.5 21.75 11 21.25 10.75L17.5 8.5Z" fill="#FFC800"/>
                    <path d="M3.25 3.25C3.5 3.1 3.85 3 4.25 3C4.6 3 4.9 3.1 5.25 3.25L17.5 8.5L13.5 12L3.25 3.25Z" fill="#00E676"/>
                    <path d="M3.25 20.75L13.5 12L17.5 15.5L5.25 20.75C4.9 20.9 4.6 21 4.25 21C3.85 21 3.5 20.9 3.25 20.75Z" fill="#FF3D00"/>
                  </svg>
                  <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                    <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 500, opacity: 0.8 }}>Get it on</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Google Play</div>
                  </div>
                </a>
              ) : (
                <a href="#download" onClick={scrollToDownload} className="btn btn-primary btn-lg px-10">
                  Download App
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
                </a>
              )}
            </div>


          </div>
          {/* ... Mockup part continues below ... */}

          {/* Dashboard Mockup */}
          <div style={{ transform: `perspective(1200px) rotateX(${my*2}deg) rotateY(${mx*-2}deg)`, transition: 'transform 0.4s ease-out' }}>
            <AnimatedDashboardMockup />
          </div>
        </div>
      </section>

      {/* ─── MAJOR USP ───────────────────────────────────────── */}
      <section id="features" className="section">
        <div className="container">
          <div className="text-center" style={{ maxWidth: 700, marginInline: "auto", marginBottom: "4rem" }}>
            <div className="pill pill-orange mb-6" style={{ display: "inline-flex" }}>The Routinely Advantage</div>
            <h2 className="h2" style={{ marginBottom: "1rem" }}>Turn messy thoughts into an optimized schedule</h2>
            <p className="body-lg text-muted">
              Just describe your goals or tasks in plain language, and our AI instantly builds a complete, optimized routine for your day. No more manual planning.
            </p>
          </div>
          <div style={{ maxWidth: 980, marginInline: "auto", background: "var(--bg-2)", borderRadius: 24, padding: 12, border: "1px solid var(--border)", boxShadow: "0 30px 60px rgba(0,0,0,0.08)" }}>
            <USPShowcase />
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
              <div id="download" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', width: '100%' }}>
                {isMobile ? (
                  <a href={playStoreUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg px-8" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', borderRadius: 'var(--r-full)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.25 3.25L13.5 12L3.25 20.75C3.1 20.5 3 20.15 3 19.75V4.25C3 3.85 3.1 3.5 3.25 3.25Z" fill="#00C0FF"/>
                      <path d="M17.5 8.5L13.5 12L17.5 15.5L21.25 13.25C21.75 13 22 12.5 22 12C22 11.5 21.75 11 21.25 10.75L17.5 8.5Z" fill="#FFC800"/>
                      <path d="M3.25 3.25C3.5 3.1 3.85 3 4.25 3C4.6 3 4.9 3.1 5.25 3.25L17.5 8.5L13.5 12L3.25 3.25Z" fill="#00E676"/>
                      <path d="M3.25 20.75L13.5 12L17.5 15.5L5.25 20.75C4.9 20.9 4.6 21 4.25 21C3.85 21 3.5 20.9 3.25 20.75Z" fill="#FF3D00"/>
                    </svg>
                    <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                      <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 500, opacity: 0.8 }}>Get it on</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Google Play</div>
                    </div>
                  </a>
                ) : (
                  <div className="card-glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', maxWidth: '360px', width: '100%', marginInline: 'auto', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ background: '#ffffff', padding: '12px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=0a0a0f&bgcolor=ffffff&data=${encodeURIComponent(playStoreUrl)}`} 
                        alt="Scan to Download Routinely App" 
                        width="180" 
                        height="180" 
                        style={{ display: 'block' }}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>Scan to Download</h3>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', lineHeight: 1.5 }}>Point your phone's camera at the QR code to install the Routinely app on Google Play.</p>
                    </div>
                  </div>
                )}
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
