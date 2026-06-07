import React from 'react';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-10 rounded-2xl shadow-sm">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Cookie Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last Updated: June 5, 2026</p>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <p>
            This Cookie Policy explains how Routinely ("we", "us", and "our") uses cookies and similar technologies when you visit our landing page and interact with our services. It explains what these technologies are, why we use them, and your rights to control their use.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. What Are Cookies?</h2>
          <p>
            Cookies are small data files that are stored on your computer or mobile device when you visit a website. They are widely used by website owners to make their websites work, improve loading speeds, and provide analytical reporting information.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Why Do We Use Cookies?</h2>
          <p>
            We use cookies for a few reasons. Some cookies are required for technical reasons in order for our website to load and function properly (referred to as "essential" or "strictly necessary" cookies). Other cookies help us analyze site traffic, user interactions, and performance so we can continuously improve the user experience.
          </p>
          <p>
            Specifically, we use third-party analytics tools (such as Google Analytics) to help us measure web traffic, trace visitor paths, and monitor page performance. These tools place cookies on your device to collect anonymous statistical information.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Types of Cookies We Use</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Essential Cookies:</strong> Required to deliver page content, secure your browsing experience, and load site assets correctly. These cannot be disabled.
            </li>
            <li>
              <strong>Analytics and Performance Cookies:</strong> Used by Google Analytics and other performance tools to collect anonymous statistics about how long visitors stay on the site, which pages they click, and what devices they use. No personal identifiable information (PII) is linked to this data.
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. How Can I Control Cookies?</h2>
          <p>
            You have the right to decide whether to accept or reject cookies. You can set or change your web browser controls to accept or refuse cookies. If you choose to reject cookies, you can still access and use our website, though some pages or features may have limited performance.
          </p>
          <p>
            To opt out of being tracked by Google Analytics across all websites, you can install the Google Analytics Opt-out Browser Add-on provided by Google.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time in order to reflect changes to the cookies we use or for other operational, legal, or regulatory reasons. Please revisit this page regularly to stay informed about our use of cookies.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Contact Us</h2>
          <p>
            If you have any questions or comments about this Cookie Policy, you can email us at <strong>privacy@routinely.app</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
