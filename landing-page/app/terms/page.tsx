import React from 'react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-10 rounded-2xl shadow-sm">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Last Updated: June 4, 2026</p>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <p>
            These Terms of Service ("Terms") constitute a legally binding agreement made between you ("User", "you") and Routinely ("we," "us," or "our"), concerning your access to and use of the Routinely mobile application and website (the "Services"). By accessing or using the Services, you agree to be bound by these Terms.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Use of the Services</h2>
          <p>You may use our Services only for lawful purposes and in accordance with these Terms. You agree not to use the Services:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>In any way that violates any applicable national or international law or regulation.</li>
            <li>To exploit, harm, or attempt to exploit or harm minors in any way.</li>
            <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter", "spam", or any other similar solicitation.</li>
            <li>To impersonate or attempt to impersonate Routinely, a Routinely employee, another user, or any other person or entity.</li>
            <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Services, or which, as determined by us, may harm Routinely or users of the Services or expose them to liability.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Account Registration and Security</h2>
          <p>To use certain features of the Services, you may be required to register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and you agree not to disclose your password to any third party.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. AI Processing and Data Usage</h2>
          <p>The Services utilize Artificial Intelligence (AI) and Large Language Models (LLMs) to generate schedules and analyze routines. By submitting text or voice inputs to our Services, you grant us the right to process this data to provide the Services. We do not use your personal inputs to train foundational AI models, but we do transmit them securely to our partners (e.g., Groq) for real-time inference.</p>
          <p><strong>Voice Data:</strong> Any audio you upload for speech-to-text processing is transiently processed and immediately discarded. It is not permanently stored on our servers.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Subscriptions and Billing</h2>
          <p>Certain features of the Services may require a paid subscription. If you choose to purchase a subscription, you agree to pay the fees in accordance with the pricing and billing terms presented to you at the time of purchase. Subscriptions will automatically renew unless canceled prior to the end of the current billing cycle.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Account Termination</h2>
          <p>We may terminate or suspend your account and bar access to the Services immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms. If you wish to terminate your account, you may simply discontinue using the Services or use the "Delete Account" feature within the app to erase your data.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Limitation of Liability</h2>
          <p>In no event shall Routinely, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Services; (ii) any conduct or content of any third party on the Services; (iii) any content obtained from the Services; and (iv) unauthorized access, use or alteration of your transmissions or content.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Contact Us</h2>
          <p>If you have questions or comments about these Terms, you may email us at <strong>legal@routinely.app</strong>.</p>
        </div>
      </div>
    </div>
  );
}
