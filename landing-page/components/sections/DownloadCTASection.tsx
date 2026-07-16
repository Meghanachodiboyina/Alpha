'use client';
import { motion } from 'framer-motion';

export default function DownloadCTASection({ isMobile }: { isMobile: boolean }) {
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.routinely.app';

  return (
    <section id="download" className="section" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          style={{
            maxWidth: 760,
            marginInline: 'auto',
            textAlign: 'center',
            position: 'relative',
            padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 4vw, 3rem)',
            background: 'linear-gradient(160deg, rgba(255,107,53,0.07) 0%, rgba(255,107,53,0.02) 100%)',
            border: '1px solid rgba(255,107,53,0.15)',
            borderRadius: 32,
            overflow: 'hidden',
          }}
        >
          {/* Glow */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 480, height: 480,
            background: 'radial-gradient(ellipse, rgba(255,107,53,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          {/* Top accent line */}
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: 'linear-gradient(90deg, transparent, var(--orange), transparent)' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p className="caption" style={{ color: 'var(--orange)', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>✦ GET STARTED</p>

            <h2 className="h2" style={{ marginBottom: '1rem' }}>
              Start planning smarter.
            </h2>
            <p style={{ fontSize: '1.0625rem', color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 460, marginInline: 'auto', marginBottom: '2.5rem' }}>
              Let Orbit organize your day so you can focus on living it.
            </p>

            {isMobile ? (
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}
              >
                <GooglePlayBadge size={20} />
                <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                  <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 600, opacity: 0.75 }}>Get it on</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Google Play</div>
                </div>
              </a>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                {/* QR Code */}
                <div style={{ position: 'relative' }}>
                  <div style={{ background: '#fff', padding: 14, borderRadius: 20, boxShadow: '0 16px 48px rgba(0,0,0,0.3)', display: 'inline-block' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=0a0a0f&bgcolor=ffffff&qzone=1&data=${encodeURIComponent(playStoreUrl)}`}
                      alt="Scan to download Routinely"
                      width="180"
                      height="180"
                      style={{ display: 'block', borderRadius: 8 }}
                    />
                  </div>
                  {/* Orbit icon overlay center of QR */}
                </div>

                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 6 }}>
                    Scan to download
                  </p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
                    Point your camera at the QR code to install free on Android
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 10, paddingInline: '1.75rem' }}
                  >
                    <GooglePlayBadge size={18} />
                    Download on Google Play
                  </a>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                  Free · Android · No ads
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function GooglePlayBadge({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.25 3.25L13.5 12L3.25 20.75C3.1 20.5 3 20.15 3 19.75V4.25C3 3.85 3.1 3.5 3.25 3.25Z" fill="#00C0FF" />
      <path d="M17.5 8.5L13.5 12L17.5 15.5L21.25 13.25C21.75 13 22 12.5 22 12C22 11.5 21.75 11 21.25 10.75L17.5 8.5Z" fill="#FFC800" />
      <path d="M3.25 3.25C3.5 3.1 3.85 3 4.25 3C4.6 3 4.9 3.1 5.25 3.25L17.5 8.5L13.5 12L3.25 3.25Z" fill="#00E676" />
      <path d="M3.25 20.75L13.5 12L17.5 15.5L5.25 20.75C4.9 20.9 4.6 21 4.25 21C3.85 21 3.5 20.9 3.25 20.75Z" fill="#FF3D00" />
    </svg>
  );
}
