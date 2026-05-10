"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState } from "react";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const faqs = [
    {
      q: "Can I cancel my subscription at any time?",
      a: "Yes, you can cancel your subscription at any time. If you cancel, you will keep your Pro features until the end of your current billing cycle."
    },
    {
      q: "Is there a free trial for the Pro plan?",
      a: "We currently do not offer a free trial for the Pro plan, but you can start with our Free plan to experience the core features before upgrading."
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept all major credit cards including Visa, Mastercard, and American Express. Payments are processed securely via Stripe."
    },
    {
      q: "Can I switch between monthly and yearly billing?",
      a: "Yes, you can easily switch your billing cycle from your account settings. Changes will be applied to your next billing cycle."
    }
  ];

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      <main style={{ flex: 1, paddingTop: "6rem" }}>

        {/* ─── PRICING HERO ─── */}
        <section className="section" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Background effects */}
          <div className="orb orb-purple" style={{ top: '10%', left: '20%', width: 400, height: 400, opacity: 0.08 }} />
          <div className="orb orb-orange" style={{ top: '30%', right: '15%', width: 500, height: 500, opacity: 0.05 }} />

          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <div className="text-center mb-12">
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1rem', color: 'var(--text)' }}>
                Invest in your <span style={{ color: 'var(--orange)' }}>focus.</span>
              </h1>
              <p className="body-lg text-muted" style={{ maxWidth: 600, marginInline: 'auto', marginBottom: '3rem' }}>
                Simple, transparent pricing that scales with your ambition. Choose the plan that fits your workflow.
              </p>

              {/* Billing Toggle */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', background: 'var(--bg-3)',
                padding: '0.375rem', borderRadius: '99px', border: '1px solid var(--border)'
              }}>
                <button
                  onClick={() => setBillingCycle("monthly")}
                  style={{
                    padding: '0.625rem 1.25rem', borderRadius: '99px', fontSize: '0.875rem', fontWeight: 600,
                    background: billingCycle === "monthly" ? 'var(--surface)' : 'transparent',
                    color: billingCycle === "monthly" ? 'var(--text)' : 'var(--text-2)',
                    boxShadow: billingCycle === "monthly" ? 'var(--shadow)' : 'none',
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  style={{
                    padding: '0.625rem 1.25rem', borderRadius: '99px', fontSize: '0.875rem', fontWeight: 600,
                    background: billingCycle === "yearly" ? 'var(--surface)' : 'transparent',
                    color: billingCycle === "yearly" ? 'var(--text)' : 'var(--text-2)',
                    boxShadow: billingCycle === "yearly" ? 'var(--shadow)' : 'none',
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  Yearly <span style={{ background: 'var(--green-light)', color: 'var(--green)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>Save 20%</span>
                </button>
              </div>
            </div>

            <div className="pricing-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2.5rem',
              maxWidth: 900,
              marginInline: 'auto',
              paddingTop: '1.5rem' // Room for 'Most Popular' badge
            }}>
              {/* Free Plan */}
              <div className="card" style={{ padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                <div className="mb-8">
                  <h3 className="h3 mb-2">Free</h3>
                  <p className="body-sm text-muted">Perfect for individuals getting started with AI-assisted planning.</p>
                </div>
                <div className="mb-8">
                  <span style={{ fontSize: '3.5rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>₹0</span>
                  <span className="text-muted" style={{ fontWeight: 500 }}>/mo</span>
                </div>
                <div style={{ flex: 1, marginBottom: '2.5rem' }}>
                  {[
                    '3 AI Routine Generations /mo',
                    'Basic Task Tracking',
                    '1 Project Workspace',
                    'Standard Focus Timer',
                    'Community Support',
                  ].map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, fontSize: '0.9375rem', color: 'var(--text-2)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      {feat}
                    </div>
                  ))}
                </div>
                <Link href="/register" className="btn btn-ghost w-full" style={{ padding: '1rem', fontSize: '1rem' }}>Get Started</Link>
              </div>

              {/* Pro Plan */}
              <div className="card" style={{
                padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column',
                border: '2px solid var(--orange)', position: 'relative',
                background: 'linear-gradient(180deg, var(--surface) 0%, rgba(255,107,53,0.05) 100%)',
                boxShadow: '0 20px 40px rgba(255,107,53,0.1)'
              }}>
                <div style={{
                  position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--orange)', color: 'white', padding: '6px 16px', borderRadius: 20,
                  fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                  boxShadow: '0 4px 12px rgba(255,107,53,0.3)'
                }}>Most Popular</div>

                <div className="mb-8">
                  <h3 className="h3 mb-2">Pro</h3>
                  <p className="body-sm text-muted">For high-performers and teams needing ultimate control.</p>
                </div>
                <div className="mb-8" style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <span style={{ fontSize: '3.5rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
                    ₹{billingCycle === "yearly" ? "199" : "299"}
                  </span>
                  <div style={{ paddingBottom: '0.5rem' }}>
                    <span className="text-muted" style={{ fontWeight: 500, display: 'block' }}>/mo</span>
                    {billingCycle === "yearly" && <span style={{ fontSize: '0.75rem', color: 'var(--orange)', fontWeight: 600 }}>Billed annually</span>}
                  </div>
                </div>
                <div style={{ flex: 1, marginBottom: '2.5rem' }}>
                  {[
                    'Unlimited AI Routine Generations',
                    'Unlimited Voice Task Input',
                    'Priority Smart Rescheduling',
                    'Unlimited Projects & Teams',
                    'Advanced Productivity Analytics',
                    'Priority 24/7 Support',
                  ].map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, fontSize: '0.9375rem', color: 'var(--text)', fontWeight: 500 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      {feat}
                    </div>
                  ))}
                </div>
                <Link href="/register" className="btn btn-primary w-full" style={{ padding: '1rem', fontSize: '1rem' }}>Upgrade to Pro</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FAQ SECTION ─── */}
        <section className="section" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-2)' }}>
          <div className="container" style={{ maxWidth: 800 }}>
            <div className="text-center mb-12">
              <h2 className="h2">Frequently Asked Questions</h2>
              <p className="body-lg text-muted mt-4">Have a different question? Contact our support team.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {faqs.map((faq, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem 2rem' }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>{faq.q}</h4>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="section" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
          <div className="container">
            <div className="card text-center cta-section" style={{ maxWidth: 800, marginInline: 'auto', padding: '5rem 2rem', background: 'var(--bg-2)', position: 'relative', overflow: 'hidden' }}>
              <div className="orb orb-orange" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, opacity: 0.08 }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h2 className="h2 mb-4">Ready to take back your time?</h2>
                <p className="body-lg text-muted mb-8" style={{ maxWidth: 500, marginInline: 'auto' }}>
                  Join thousands of high-performers who use Routinely to stay focused and productive.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link href="/register" className="btn btn-primary btn-lg">Start your free journey</Link>
                  <Link href="/login" className="btn btn-ghost btn-lg">Sign in</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
