'use client';
import { useEffect, useRef, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/sections/HeroSection';
import HowOrbitWorksSection from '@/components/sections/HowOrbitWorksSection';
import ComparisonSection from '@/components/sections/ComparisonSection';
import RealLifeSection from '@/components/sections/RealLifeSection';
import AboutSection from '@/components/sections/AboutSection';
import DownloadCTASection from '@/components/sections/DownloadCTASection';

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);
  const howOrbitRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768);
    setReady(true);
  }, []);

  const scrollToOrbitSection = () => {
    const el = document.getElementById('how-orbit-works');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  if (!ready) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #ff6b35, #ff9f6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse-ring 1.5s ease-in-out infinite', fontSize: 20, color: 'white' }}>✦</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      {/* S1: Hero — "Your day. Planned by Orbit." */}
      <HeroSection onScrollToOrbitSection={scrollToOrbitSection} />

      {/* S2: How Orbit Works — 3 interactive steps */}
      <HowOrbitWorksSection />

      {/* S3: Why Routinely Is Different — Comparison + Decathlon demo */}
      <ComparisonSection />

      {/* S5: Built for Real Life — expandable constraint cards */}
      <RealLifeSection />

      {/* S6: About Routinely — narrative + Orbit phone */}
      <AboutSection />

      {/* S7: Final CTA — QR code + Google Play */}
      <DownloadCTASection isMobile={isMobile} />

      <Footer />
    </div>
  );
}
