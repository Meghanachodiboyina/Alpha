'use client';

import { useState } from "react";
import { Check } from "lucide-react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/mo",
    features: ["AI Routine Builder (Basic)", "Up to 5 Goals", "Mobile App Access"],
    action: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$5",
    period: "/mo",
    features: [
      "Advanced AI Scheduling",
      "Unlimited Goals",
      "Voice Task Input",
      "Smart Rescheduling",
      "Deep Analytics",
    ],
    action: "Start Free Trial",
    recommended: true,
  },
  {
    id: "team",
    name: "Team",
    price: "$10",
    period: "/user/mo",
    features: ["Everything in Pro", "Shared Workspaces", "Team Velocity Tracking", "Priority Support"],
    action: "Contact Sales",
  },
];

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const selectPlan = (planId: string) => setSelectedPlan(planId);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Navbar />

      <section
        className="relative overflow-hidden"
        style={{
          paddingTop: "clamp(7rem, 14vw, 11rem)",
          paddingBottom: "clamp(3rem, 6vw, 5rem)",
        }}
      >
        <div
          className="orb orb-orange"
          style={{
            width: 500,
            height: 500,
            top: -150,
            right: -150,
            opacity: 0.1,
            position: "absolute",
            background: "radial-gradient(circle, var(--orange) 0%, transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
            borderRadius: "50%",
          }}
        />
        <div className="container">
          <div className="flex flex-col items-center text-center" style={{ maxWidth: 820, marginInline: "auto" }}>
            <h1 className="h1 anim-fade-up" style={{ marginBottom: "1.5rem" }}>
              Simple, transparent <span style={{ color: "var(--orange)" }}>pricing</span>
            </h1>
            <p
              className="body-lg text-muted anim-fade-up-delay-1"
              style={{ maxWidth: 580, marginInline: "auto", marginBottom: "2.5rem", color: "var(--text-2)" }}
            >
              Invest in your productivity. Choose the plan that fits your workflow.
            </p>
          </div>
        </div>
      </section>

      <section className="section-sm" style={{ paddingTop: 0 }}>
        <div className="container">
          <div
            className="pricing-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "2rem",
              alignItems: "stretch",
            }}
          >
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;

              return (
                <article
                  className="card card-hover"
                  key={plan.id}
                  onClick={() => selectPlan(plan.id)}
                  style={{
                    background: isSelected ? "var(--bg-3)" : "var(--bg-2)",
                    padding: "2.5rem",
                    borderRadius: "var(--r-xl)",
                    border: `2px solid ${isSelected ? "var(--orange)" : "var(--border)"}`,
                    position: "relative",
                    transform: "scale(1)",
                    boxShadow: isSelected ? "0 12px 40px rgba(255, 107, 53, 0.15)" : "none",
                    zIndex: isSelected ? 2 : 1,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    overflow: "visible",
                    outline: isSelected ? "2px solid var(--orange)" : "none",
                    outlineOffset: "-2px",
                  }}
                >
                  {plan.recommended && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-14px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "var(--orange)",
                        color: "#fff",
                        padding: "6px 16px",
                        borderRadius: "var(--r-full)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        zIndex: 3,
                      }}
                    >
                      Recommended
                    </div>
                  )}

                  <h3 className="h3" style={{ marginBottom: "0.5rem" }}>
                    {plan.name}
                  </h3>
                  <div
                    style={{
                      fontSize: "2.5rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-display)",
                      marginBottom: "1.5rem",
                      color: isSelected ? "var(--orange)" : "var(--text)",
                    }}
                  >
                    {plan.price}
                    <span style={{ fontSize: "1rem", color: "var(--text-2)", fontWeight: 400 }}>{plan.period}</span>
                  </div>

                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      marginBottom: "2rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                      flexGrow: 1,
                    }}
                  >
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        style={{
                          display: "flex",
                          gap: "0.75rem",
                          color: isSelected ? "var(--text)" : "var(--text-2)",
                        }}
                      >
                        <Check
                          size={18}
                          strokeWidth={2.2}
                          style={{ color: isSelected ? "var(--orange)" : "var(--text)", flexShrink: 0, marginTop: 3 }}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    aria-pressed={isSelected}
                    className={`btn ${isSelected ? "btn-primary" : "btn-ghost"}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectPlan(plan.id);
                    }}
                    style={{ width: "100%", padding: "1rem" }}
                    type="button"
                  >
                    {plan.action}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
