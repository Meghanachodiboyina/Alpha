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
              <span className="footer-brand-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="6.6" stroke="white" strokeWidth="1.6" />
                  <circle cx="10" cy="10" r="2.4" fill="white" />
                  <path d="M10 1.8v3M10 15.2v3M1.8 10h3M15.2 10h3" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <span>Routinely</span>
            </Link>
            <p>The AI-powered productivity OS for modern teams.</p>
          </div>

          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Features" links={featureLinks} />
          <FooterColumn title="Company" links={companyLinks} />

          <div className="footer-column">
            <h3>Connect</h3>
            <nav aria-label="Connect">
              {connectLinks.map((link) => {
                return (
                  <a
                    className="footer-connect-link"
                    href={link.href}
                    key={link.label}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                  >
                    {link.icon === "mail" ? (
                      <Mail size={20} strokeWidth={1.9} />
                    ) : (
                      <span className="footer-social-mark">{link.icon}</span>
                    )}
                    <span>{link.label}</span>
                  </a>
                );
              })}
              <a className="footer-connect-link" href="https://x.com" rel="noopener noreferrer" target="_blank">
                <span className="footer-x-icon">X</span>
                <span>X (Twitter)</span>
              </a>
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
