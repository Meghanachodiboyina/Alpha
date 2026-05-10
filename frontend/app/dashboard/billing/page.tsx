'use client';

import React from 'react';

export default function BillingPage() {
  const [currentPlan] = React.useState<"Free" | "Pro">("Free"); // Mock state

  const plans = [
    {
      name: "Free",
      price: "₹0",
      features: ["3 AI Generations /mo", "1 Project Workspace", "Basic Analytics"],
      current: currentPlan === "Free"
    },
    {
      name: "Pro",
      price: "₹499",
      features: ["Unlimited AI Generations", "Unlimited Projects", "Advanced Analytics", "Priority Support"],
      current: currentPlan === "Pro"
    }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>Billing & Subscription</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Manage your plan, payment methods, and billing history.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {plans.map((plan) => (
          <div key={plan.name} style={{
            background: 'var(--bg-2)',
            border: plan.current ? '2px solid var(--orange)' : '1px solid var(--border)',
            borderRadius: 16,
            padding: '2rem',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {plan.current && (
              <div style={{
                position: 'absolute', top: -12, right: 20,
                background: 'var(--orange)', color: 'white',
                padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700
              }}>Current Plan</div>
            )}
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>{plan.name}</h3>
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>{plan.price}</span>
              <span style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}> / month</span>
            </div>
            
            <div style={{ flex: 1, marginBottom: '2rem' }}>
              {plan.features.map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: '0.875rem', color: 'var(--text-2)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {plan.name === "Free" && plan.current && i === 0 ? <strong>{feat}</strong> : feat}
                </div>
              ))}
            </div>

            <button 
              disabled={plan.current}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 10,
                border: 'none',
                background: plan.current ? 'var(--surface)' : 'var(--orange)',
                color: plan.current ? 'var(--text-3)' : 'white',
                fontWeight: 600,
                cursor: plan.current ? 'default' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {plan.current ? 'Active' : 'Upgrade to Pro'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ 
        background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text)' }}>Payment History</h3>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)', fontSize: '0.9rem' }}>
          No recent transactions found.
        </div>
      </div>
    </div>
  );
}
