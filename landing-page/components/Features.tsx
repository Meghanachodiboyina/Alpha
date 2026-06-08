'use client';

import { Sparkles, Target, Users, BarChart3 } from 'lucide-react';

const features = [
  {
    title: 'AI Planning',
    description: 'Natural language or voice, Routinely creates the perfect plan for your day.',
    icon: <Sparkles size={24} />,
    color: '#f97316',
    bg: '#FFF7F0'
  },
  {
    title: 'Project Tracking',
    description: 'Align daily routines with your core projects and milestones automatically.',
    icon: <Target size={24} />,
    color: '#ef4444',
    bg: '#FEF2F2'
  },
  {
    title: 'Team Collaboration',
    description: 'Work together with your team in shared workspaces and projects.',
    icon: <Users size={24} />,
    color: '#8b5cf6',
    bg: '#F5F3FF'
  },
  {
    title: 'Insights & Analytics',
    description: 'Understand your productivity with beautiful insights and smart analytics.',
    icon: <BarChart3 size={24} />,
    color: '#3b82f6',
    bg: '#EFF6FF'
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="container">
        <div className="grid md-grid-cols-2 lg-grid-cols-4 gap-12">
          {features.map((feature, i) => (
            <div key={i} className="feature-card p-8 rounded-2xl transition-all">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: feature.bg, color: feature.color }}
              >
                {feature.icon}
              </div>
              <h3 className="text-xl mb-4 font-bold">{feature.title}</h3>
              <p className="text-muted text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
