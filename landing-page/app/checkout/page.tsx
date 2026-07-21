import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Crown,
  HelpCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";

const features = [
  "Advanced AI Scheduling",
  "Unlimited Goals",
  "Voice Task Input",
  "Smart Rescheduling",
  "Deep Analytics",
];

function Field({
  icon: Icon,
  label,
  placeholder,
  inputMode,
  type = "text",
}: {
  icon: typeof User;
  label: string;
  placeholder: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "search" | "email" | "url";
  type?: string;
}) {
  return (
    <label className="checkout-field">
      <span>{label}</span>
      <span className="checkout-input-wrap">
        <Icon size={20} strokeWidth={1.8} />
        <input type={type} placeholder={placeholder} inputMode={inputMode} />
      </span>
    </label>
  );
}

export default function CheckoutPage() {
  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <Link href="/" className="checkout-brand" aria-label="Routinely home">
          <span className="nav-logo-icon" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-svg" style={{ transition: "transform 0.3s ease" }}>
              <defs>
                <linearGradient id="routinely-grad-checkout" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--orange)" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="var(--purple)" />
                </linearGradient>
                <filter id="r-shadow-checkout" x="-2" y="-2" width="36" height="36" filterUnits="userSpaceOnUse">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.4" />
                </filter>
              </defs>
              <g filter="url(#r-shadow-checkout)">
                <path d="M 19.6 2.5 A 14 14 0 1 0 29.5 12.4" fill="none" stroke="url(#routinely-grad-checkout)" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="25.9" cy="6.1" r="2.8" fill="url(#routinely-grad-checkout)" />
                <path d="M 12 8 L 18 8 A 5.5 5.5 0 0 1 18 19 L 9 19 L 14 24 L 18 24 L 10 16 L 18 16 A 2.5 2.5 0 0 0 18 11 L 9 11 Z" fill="url(#routinely-grad-checkout)" />
              </g>
            </svg>
          </span>
          <span className="checkout-brand-text nav-logo-text">Routinely</span>
        </Link>
        <div className="checkout-secure-label">
          <LockKeyhole size={18} strokeWidth={1.9} />
          <span>Secure Checkout</span>
        </div>
      </header>

      <section className="checkout-shell">
        <div className="checkout-left">
          <Link href="/pricing" className="checkout-back">
            <ArrowLeft size={18} strokeWidth={2.1} />
            Back to Pricing
          </Link>

          <div className="checkout-title-group">
            <h1>Checkout</h1>
            <p>Complete your payment to get started with Pro.</p>
          </div>

          <div className="checkout-plan-card">
            <div className="checkout-plan-left">
              <span className="checkout-plan-icon">
                <Crown size={26} strokeWidth={1.9} />
              </span>
              <div>
                <h2>Pro Plan</h2>
                <p>Billed monthly</p>
              </div>
            </div>
            <div className="checkout-plan-price">
              <strong>$5</strong>
              <span>/month</span>
            </div>
          </div>

          <form className="checkout-form">
            <section className="checkout-form-section">
              <h2>Customer Information</h2>
              <Field icon={User} label="Full Name" placeholder="Enter your full name" />
              <Field icon={Mail} label="Email Address" placeholder="Enter your email address" type="email" />
            </section>

            <section className="checkout-form-section">
              <h2>Payment Method</h2>
              <div className="checkout-payment-box">
                <div className="checkout-payment-top">
                  <div className="checkout-card-choice">
                    <span className="checkout-radio" />
                    <CreditCard size={26} strokeWidth={1.8} />
                    <span>Credit / Debit Card</span>
                  </div>
                  <div className="checkout-card-badges" aria-label="Supported card types">
                    <span>VISA</span>
                    <span>MC</span>
                    <span>AMEX</span>
                  </div>
                </div>

                <Field icon={CreditCard} label="Card Number" placeholder="1234 1234 1234 1234" inputMode="numeric" />

                <div className="checkout-field-grid">
                  <Field icon={CreditCard} label="Expiry Date" placeholder="MM / YY" />
                  <label className="checkout-field">
                    <span>CVV</span>
                    <span className="checkout-input-wrap">
                      <LockKeyhole size={20} strokeWidth={1.8} />
                      <input type="text" placeholder="123" inputMode="numeric" />
                      <HelpCircle size={18} strokeWidth={1.8} />
                    </span>
                  </label>
                </div>

                <Field icon={User} label="Cardholder Name" placeholder="Name on card" />

                <button className="checkout-pay-button" type="button">
                  <LockKeyhole size={20} strokeWidth={2} />
                  Pay Now
                </button>

                <p className="checkout-encrypted">
                  <LockKeyhole size={17} strokeWidth={1.9} />
                  Secure &amp; Encrypted Payment
                </p>
              </div>
            </section>
          </form>
        </div>

        <aside className="checkout-summary" aria-label="Order summary">
          <h2>Order Summary</h2>

          <div className="checkout-summary-plan">
            <span className="checkout-plan-icon">
              <Crown size={26} strokeWidth={1.9} />
            </span>
            <div>
              <h3>Pro Plan</h3>
              <p>Billed monthly</p>
            </div>
            <strong>$5.00</strong>
          </div>

          <div className="checkout-summary-lines">
            <div>
              <span>Subtotal</span>
              <strong>$5.00</strong>
            </div>
            <div>
              <span>Tax</span>
              <strong>$0.00</strong>
            </div>
          </div>

          <div className="checkout-total">
            <span>Total</span>
            <strong>$5.00 <small>/month</small></strong>
          </div>

          <div className="checkout-features">
            <h3>What&apos;s included in Pro?</h3>
            <ul>
              {features.map((feature) => (
                <li key={feature}>
                  <CheckCircle2 size={20} strokeWidth={1.9} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="checkout-security-box">
            <ShieldCheck size={42} strokeWidth={1.8} />
            <div>
              <h3>Secure &amp; Encrypted</h3>
              <p>Your payment information is protected.</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
