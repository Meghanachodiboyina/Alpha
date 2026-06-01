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
          <span className="checkout-brand-mark">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 3L17 7v6l-7 4-7-4V7l7-4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="10" cy="10" r="2" fill="white" />
            </svg>
          </span>
          <span className="checkout-brand-text">Routinely</span>
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
