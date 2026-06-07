import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", paddingBlock: "3rem" }}>
      <div className="container">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "3rem", marginBottom: "3rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div className="nav-logo-icon">
                <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-svg" style={{ transition: 'transform 0.3s ease' }}>
                  <defs>
                    <linearGradient id="routinely-grad-footer" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--orange)" />
                      <stop offset="50%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="var(--purple)" />
                    </linearGradient>
                    <filter id="r-shadow-footer" x="-2" y="-2" width="36" height="36" filterUnits="userSpaceOnUse">
                      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.4" />
                    </filter>
                  </defs>
                  <g filter="url(#r-shadow-footer)">
                    {/* Orbit */}
                    <path d="M 19.6 2.5 A 14 14 0 1 0 29.5 12.4" fill="none" stroke="url(#routinely-grad-footer)" strokeWidth="2.5" strokeLinecap="round" />
                    
                    {/* Orbital Dot */}
                    <circle cx="25.9" cy="6.1" r="2.8" fill="url(#routinely-grad-footer)" />
                    
                    {/* Letter R */}
                    <path d="M 12 8 L 18 8 A 5.5 5.5 0 0 1 18 19 L 9 19 L 14 24 L 18 24 L 10 16 L 18 16 A 2.5 2.5 0 0 0 18 11 L 9 11 Z" fill="url(#routinely-grad-footer)" />
                  </g>
                </svg>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.125rem" }}>Routinely</span>
            </div>
            <p className="body-sm text-muted">The AI-powered productivity OS for high-performers.</p>
          </div>
          {[
            { title: "Product", links: ["Features", "How it works"] },
            { title: "Company", links: ["About", "Blog"] },
            { title: "Legal", links: ["Privacy", "Terms", "Cookies"] },
          ].map(col => (
            <div key={col.title}>
              <div className="caption text-faint mb-4">{col.title}</div>
              {col.links.map(l => {
                let href = '#';
                if (l === 'Features') href = '#features';
                else if (l === 'How it works') href = '#how';
                else if (l === 'Privacy') href = '/privacy';
                else if (l === 'Terms') href = '/terms';
                else if (l === 'Cookies') href = '/cookies';
                return (
                  <div key={l} style={{ marginBottom: "0.625rem" }}>
                    <Link href={href} className="body-sm text-muted hover-glow">
                      {l}
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <p className="body-sm text-faint">© {new Date().getFullYear()} Routinely. All rights reserved.</p>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {["Twitter","LinkedIn","GitHub"].map(s => <a key={s} href="#" className="body-sm text-muted">{s}</a>)}
          </div>
        </div>
      </div>
    </footer>
  );
}
