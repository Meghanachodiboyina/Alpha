import {
  Bot,
  Building2,
  Cpu,
  Database,
  Download,
  Monitor,
  PenTool,
  Rocket,
  Sparkles,
  UserRound,
} from "lucide-react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const teamMembers = [
  {
    role: "Project Manager",
    name: "Krishna Kompalli",
    description: "Guides planning, coordination, and delivery across the Routinely product.",
    icon: UserRound,
    image: "/team/krishna-kompalli.jpg",
  },
  {
    role: "Backend Engineer",
    name: "Meghana Chodiboyina",
    description: "Builds secure APIs, databases, and server-side systems that power the platform.",
    icon: Database,
    image: "/team/meghana-chodiboyina.jpg",
  },
  {
    role: "AI Engineer",
    name: "Pavan Kumar Duddi",
    description: "Builds AI-powered features for automation and intelligent planning.",
    icon: Bot,
    image: "/team/pavan-kumar-duddi.jpg",
  },
  {
    role: "UI/UX Designer",
    name: "Prakhyath Sai Ponduru",
    description: "Designs intuitive, user-friendly experiences and modern interfaces.",
    icon: PenTool,
    image: "/team/prakhyath-sai-ponduru.jpg",
  },
  {
    role: "Frontend Engineer",
    name: "Pavithra Gopinath",
    description: "Creates responsive, interactive, and polished user interfaces across devices.",
    icon: Monitor,
    image: "/team/pavithra.jpg",
  },
];

export default function AboutPage() {
  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.routinely.app";

  return (
    <div
      data-theme="dark"
      style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text)" }}
    >
      <Navbar />

      <main>
        <section
          className="relative overflow-hidden"
          style={{
            paddingTop: "clamp(8rem, 14vw, 11rem)",
            paddingBottom: "clamp(4.5rem, 8vw, 7rem)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="container">
            <div
              className="text-center anim-fade-up"
              style={{ maxWidth: 760, marginInline: "auto" }}
            >
              <div
                className="caption"
                style={{
                  color: "var(--orange)",
                  marginBottom: "1rem",
                  letterSpacing: "0.08em",
                }}
              >
                ABOUT US
              </div>
              <h1 className="h1" style={{ marginBottom: "1.4rem" }}>
                The Team Behind{" "}
                <span
                  style={{
                    color: "var(--orange)",
                    textShadow: "0 0 36px rgba(255, 107, 53, 0.22)",
                  }}
                >
                  Routinely
                </span>
              </h1>
              <p
                className="body-lg text-muted"
                style={{
                  maxWidth: 640,
                  marginInline: "auto",
                  color: "#c7c7d1",
                }}
              >
                Routinely is proudly built by the Flyerssoft team. We focus on
                creating intelligent productivity tools that help users plan
                smarter, stay organized, and achieve more every day.
              </p>
            </div>
          </div>
        </section>

        <section className="section-sm" style={{ background: "var(--bg)" }}>
          <div className="container">
            <div style={{ marginBottom: "2rem" }}>
              <div
                className="caption"
                style={{
                  color: "var(--orange)",
                  marginBottom: "0.9rem",
                  letterSpacing: "0.08em",
                }}
              >
                OUR TEAM
              </div>
              <h2 className="h2" style={{ maxWidth: 820, marginBottom: "0.8rem" }}>
                Meet the people who make Routinely possible
              </h2>
              <p className="body-lg text-muted" style={{ color: "#b8b8c4" }}>
                Different skills, one goal: to make daily planning smart,
                simple, and stress-free for everyone.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "clamp(1.25rem, 2.5vw, 2rem)",
                alignItems: "start",
              }}
            >
              {teamMembers.map((member, index) => {
                const RoleIcon = member.icon;

                return (
                  <article
                    className="anim-fade-up"
                    key={`${member.role}-${member.name}`}
                    style={{
                      animationDelay: `${index * 0.06}s`,
                    }}
                  >
                    <img
                      alt={`${member.name} profile`}
                      src={member.image}
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        objectFit: "cover",
                        objectPosition: "center top",
                        borderRadius: 8,
                        marginBottom: "1.35rem",
                        boxShadow: "0 22px 46px rgba(0,0,0,0.34)",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        color: "var(--orange)",
                        marginBottom: "0.95rem",
                      }}
                    >
                      <RoleIcon size={28} strokeWidth={1.8} />
                      <span className="label" style={{ fontSize: "0.95rem", color: "var(--orange)" }}>
                        {member.role}
                      </span>
                    </div>
                    <h3
                      className="h3"
                      style={{
                        fontSize: "clamp(1rem, 1.25vw, 1.18rem)",
                        marginBottom: "0.65rem",
                        color: "var(--text)",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        wordSpacing: "0.08em",
                      }}
                    >
                      {member.name}
                    </h3>
                    <p className="body-md text-muted" style={{ color: "#d3d3dc", lineHeight: 1.7 }}>
                      {member.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section-sm" style={{ background: "var(--bg)", paddingTop: 0 }}>
          <div className="container">
            <div
              className="card"
              style={{
                padding: "clamp(2rem, 5vw, 3rem)",
                textAlign: "center",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                borderColor: "rgba(255,255,255,0.09)",
                borderRadius: 18,
              }}
            >
              <div
                className="caption"
                style={{
                  color: "var(--orange)",
                  marginBottom: "0.7rem",
                  letterSpacing: "0.08em",
                }}
              >
                ABOUT FLYERSSOFT
              </div>
              <h2 className="h2" style={{ fontSize: "clamp(2rem, 4vw, 2.7rem)", marginBottom: "0.8rem" }}>
                Who We Are
              </h2>
              <p
                className="body-lg text-muted"
                style={{ maxWidth: 720, marginInline: "auto", color: "#c7c7d1" }}
              >
                Flyerssoft is a technology company focused on building modern
                web and mobile applications with clean design and intelligent
                automation. We believe software should be simple, intelligent,
                and accessible to everyone.
              </p>
            </div>

            <div
              className="card"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                marginTop: "1rem",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                borderColor: "rgba(255,255,255,0.09)",
                borderRadius: 18,
                overflow: "hidden",
              }}
            >
              {[
                { icon: Building2, label: "Company", value: "Flyerssoft" },
                { icon: Rocket, label: "Product", value: "Routinely" },
                { icon: Cpu, label: "Focus", value: "AI-Powered Productivity" },
              ].map((item, index) => {
                const InfoIcon = item.icon;

                return (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1.25rem",
                      padding: "clamp(1.4rem, 4vw, 2rem)",
                      borderLeft: index === 0 ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <InfoIcon size={42} color="var(--orange)" strokeWidth={1.6} />
                    <div>
                      <div className="body-sm text-muted" style={{ color: "#b8b8c4" }}>
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "1.35rem",
                          fontWeight: 700,
                          lineHeight: 1.2,
                          color: "var(--text)",
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="download"
          className="section-sm"
          style={{
            background: "var(--bg)",
            paddingTop: 0,
          }}
        >
          <div className="container">
            <div
              className="card cta-section"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1.25rem",
                padding: "clamp(1.25rem, 3vw, 2rem)",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))",
                borderColor: "rgba(255,255,255,0.1)",
                borderRadius: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--orange)",
                    background: "radial-gradient(circle, rgba(255,107,53,0.22), rgba(255,107,53,0.04) 58%, transparent 70%)",
                    boxShadow: "0 0 44px rgba(255,107,53,0.2)",
                  }}
                >
                  <Sparkles size={28} strokeWidth={1.8} />
                </div>
                <h2
                  className="h2"
                  style={{
                    maxWidth: 520,
                    fontSize: "clamp(1.35rem, 2.6vw, 2rem)",
                    lineHeight: 1.16,
                  }}
                >
                  Built by <span style={{ color: "var(--orange)" }}>Flyerssoft.</span>
                  <br />
                  Designed for <span style={{ color: "var(--orange)" }}>productivity.</span>
                  <br />
                  Powered by <span style={{ color: "var(--orange)" }}>intelligence.</span>
                </h2>
              </div>
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg"
                style={{
                  background: "var(--orange)",
                  borderRadius: "12px",
                  minWidth: 170,
                  padding: "0.85rem 1.35rem",
                  flexShrink: 0,
                }}
              >
                Download App
                <Download size={18} strokeWidth={2.2} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
