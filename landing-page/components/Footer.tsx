import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", paddingBlock: "3rem" }}>
      <div className="container">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "3rem", marginBottom: "3rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div className="nav-logo-icon">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 3L17 7v6l-7 4-7-4V7l7-4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="10" cy="10" r="2" fill="white"/></svg>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.125rem" }}>Routinely</span>
            </div>
            <p className="body-sm text-muted">The AI-powered productivity OS for modern teams.</p>
          </div>
          {[
            { title: "Product", links: ["Features", "How it works", "Changelog"] },
            { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
            { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
          ].map(col => (
            <div key={col.title}>
              <div className="caption text-faint mb-4">{col.title}</div>
              {col.links.map(l => (
                <div key={l} style={{ marginBottom: "0.625rem" }}>
                  <Link href={l === 'Features' ? '#features' : l === 'How it works' ? '#how' : '#'} className="body-sm text-muted">
                    {l}
                  </Link>
                </div>
              ))}
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
