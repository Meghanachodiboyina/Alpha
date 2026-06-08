import Link from "next/link";
import { ChevronRight, Mail } from "lucide-react";

const productLinks = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how" },
  { label: "Pricing", href: "/pricing" },
  { label: "Download App", href: "/#download" },
];

const featureLinks = [
  { label: "AI Routine Builder", href: "/#features" },
  { label: "Smart Scheduling", href: "/#features" },
  { label: "Goal Tracking", href: "/#features" },
  { label: "Analytics", href: "/#features" },
];

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Our Team", href: "/about#team" },
  { label: "Contact Us", href: "mailto:airoutinecreator@gmail.com" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookies" },
];

const connectLinks = [
  { label: "airoutinecreator@gmail.com", href: "mailto:airoutinecreator@gmail.com", icon: "mail" },
  { label: "LinkedIn", href: "https://www.linkedin.com", icon: "in" },
  { label: "GitHub", href: "https://github.com", icon: "gh" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div className="footer-column">
      <h3>{title}</h3>
      <nav aria-label={title}>
        {links.map((link) => (
          <Link className="footer-link" href={link.href} key={link.label}>
            <ChevronRight size={17} strokeWidth={2} />
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-main">
          <div className="footer-brand-block">
            <Link href="/" className="footer-brand" aria-label="Routinely home">
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
            </Link>
            <p>The AI-powered productivity OS for modern teams.</p>
          </div>

          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Features" links={featureLinks} />
          <FooterColumn title="Company" links={companyLinks} />
          <FooterColumn title="Legal" links={legalLinks} />

          <div className="footer-column">
            <h3>Connect</h3>
            <nav aria-label="Connect">
              {connectLinks.map((link) => {
                return (
                  <a
                    className="footer-connect-link"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={link.label}
                  >
                    {link.icon === "mail" && <Mail size={17} strokeWidth={2} />}
                    {link.icon === "in" && (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                        <rect width="4" height="12" x="2" y="9" />
                        <circle cx="4" cy="4" r="2" />
                      </svg>
                    )}
                    {link.icon === "gh" && (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                        <path d="M9 18c-4.51 2-5-2-7-2" />
                      </svg>
                    )}
                    <span>{link.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Routinely. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
