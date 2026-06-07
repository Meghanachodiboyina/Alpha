import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-10 rounded-2xl shadow-sm">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last Updated: June 4, 2026</p>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <p>
            Welcome to Routinely ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and share your information when you use our mobile application and related services (collectively, the "Services").
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
          <p>We collect information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products, or otherwise contact us. The personal information that we collect depends on the context of your interactions with us and the Services. This includes:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Personal Details:</strong> Name and email address.</li>
            <li><strong>Authentication Data:</strong> Login credentials managed securely via Supabase Auth.</li>
            <li><strong>User Content:</strong> User-created routines, schedules, workspace projects, and tasks.</li>
            <li><strong>Voice Data:</strong> Audio recordings uploaded for speech-to-text processing (transiently processed, not permanently stored).</li>
            <li><strong>AI Inputs:</strong> Prompts and scheduling requests submitted to our AI engine.</li>
            <li><strong>Usage Data:</strong> App usage metadata, feature interactions, and device information required for functionality.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. How We Process Your Information</h2>
          <p>We process your personal information for a variety of reasons, depending on how you interact with our Services, including:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To facilitate account creation and authentication and otherwise manage user accounts.</li>
            <li>To provide and deliver our core services, including schedule generation and routine tracking.</li>
            <li><strong>AI Processing:</strong> Your scheduling prompts and tasks are processed by our backend and third-party LLMs (such as Groq) to generate AI-assisted routines. These providers do not use your personal prompts to train their base models.</li>
            <li><strong>Voice Processing:</strong> Audio files are transmitted to our speech-to-text API for transcription and immediately discarded after processing.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Third-Party Service Providers</h2>
          <p>We may share your data with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf and require access to such information to do that work. Our primary processors include:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Supabase:</strong> For secure database hosting and user authentication.</li>
            <li><strong>Groq:</strong> For AI inference and speech-to-text transcription.</li>
            <li><strong>Payment Processors:</strong> Future billing integrations for premium subscription tiers.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Data Retention</h2>
          <p>We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law. Once you delete your account, your routines, tasks, and usage data are immediately cascade-deleted from our active databases.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Your Privacy Rights (GDPR & CCPA)</h2>
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Right to Access:</strong> Request copies of your personal data.</li>
            <li><strong>Right to Rectification:</strong> Request that we correct any inaccurate information.</li>
            <li><strong>Right to Erasure (Right to be Forgotten):</strong> Request that we delete your personal data. You can delete your account directly through the app settings, which triggers a complete removal of your data.</li>
            <li><strong>Right to Restrict Processing:</strong> Request that we restrict the processing of your personal data.</li>
            <li><strong>Right to Data Portability:</strong> Request that we transfer the data that we have collected to another organization, or directly to you.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Security of Your Information</h2>
          <p>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Contact Us</h2>
          <p>If you have questions or comments about this notice, you may email us at <strong>privacy@routinely.app</strong>.</p>
        </div>
      </div>
    </div>
  );
}
