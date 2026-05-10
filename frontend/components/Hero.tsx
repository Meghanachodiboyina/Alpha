'use client';

import { Play, Sparkles, Star, CheckCircle2 } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-24 lg-pt-24 lg-pb-40">
      {/* Background Gradient Orbs */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-primary opacity-5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-indigo-500 opacity-5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container grid lg-grid-cols-2 gap-20 items-center">
        <div className="hero-content animate-fade-in-up">
          <div className="pill-badge mb-8">
            <Sparkles size={14} />
            <span>New: AI-Powered Routine Optimization</span>
          </div>
          
          <h1 className="text-6xl md-text-7xl lg-text-8xl mb-8 leading-[1.05] tracking-tighter">
            Plan your day with <br />
            <span className="text-primary italic">clarity.</span>
          </h1>
          
          <p className="text-xl text-muted mb-10 max-w-lg leading-relaxed font-medium">
            Routinely turns your messy thoughts into high-performance routines. 
            Start your journey with Routinely and discover what focused productivity feels like. No complex setup required.
          </p>
          
          <div className="flex flex-wrap gap-5 mb-12">
            <button className="btn btn-primary px-10 py-5 text-base shadow-xl">
              Get started for free
            </button>
            <button className="btn btn-secondary px-8 py-5 text-base group">
              <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Play size={16} fill="currentColor" />
              </div>
              Watch demo
            </button>
          </div>

          <div className="flex items-center gap-6">
            <div className="avatar-stack">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="avatar shadow-sm" />
              ))}
              <div className="avatar flex items-center justify-center bg-foreground text-white text-[10px] font-bold">+2k</div>
            </div>
            <div className="h-10 w-px bg-gray-100 hidden sm-block" />
            <div>
              <div className="flex gap-1 text-primary mb-1">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} fill="currentColor" />)}
              </div>
              <p className="text-[12px] font-bold text-muted uppercase tracking-wider">Top-rated on Product Hunt</p>
            </div>
          </div>
        </div>

        <div className="hero-visual relative lg-block">
          {/* Main Dashboard Mockup */}
          <div className="main-mockup relative z-10">
            <div className="flex items-center justify-between mb-10 border-b pb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary" />
                <span className="font-bold tracking-tight">Routinely Dashboard</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-muted">
                <span>Projects</span>
                <span>Teams</span>
                <div className="w-8 h-8 rounded-full bg-gray-100 border" />
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-6">
              <div className="col-span-3 p-6 rounded-2xl border bg-accent/50">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted">Daily Priorities</h4>
                  <div className="text-[10px] bg-white px-2 py-1 rounded border">Filter</div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Q2 Roadmap Sync', time: '09:00', color: '#ff8a50', done: true },
                    { label: 'Client Pitch Deck', time: '11:30', color: '#6366f1', done: false },
                    { label: 'Focus: Backend Refactor', time: '14:00', color: '#10b981', done: false },
                  ].map((task, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm transition-transform hover:scale-[1.02] cursor-pointer ${task.done ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-3">
                         {task.done ? <CheckCircle2 size={16} className="text-success" /> : <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: task.color }} />}
                         <span className="text-[13px] font-semibold">{task.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted">{task.time}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="col-span-2 space-y-6">
                <div className="p-6 rounded-2xl border bg-white shadow-sm flex flex-col items-center justify-center text-center">
                   <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted mb-4">Focus Score</h4>
                   <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="35" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                        <circle cx="40" cy="40" r="35" stroke="var(--primary)" strokeWidth="8" fill="transparent" strokeDasharray="220" strokeDashoffset="44" strokeLinecap="round" />
                      </svg>
                      <span className="absolute text-2xl font-bold">88</span>
                   </div>
                   <p className="text-[10px] font-semibold text-success mt-4">Great job today!</p>
                </div>
                
                <div className="p-5 rounded-2xl border bg-primary text-white shadow-lg shadow-primary/20">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">AI</div>
                     <span className="text-[11px] font-bold">New Suggestion</span>
                   </div>
                   <p className="text-[10px] opacity-90 leading-tight">Looks like you have a gap at 3 PM. Start "Deep Work" session?</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-3xl blur-2xl -z-10" />
        </div>
      </div>
    </section>
  );
}
