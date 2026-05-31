import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-[#dc2626] hover:text-[#b91c1c] transition-colors mb-8"
        >
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-black text-[#0a0a0a] mb-2">Terms of Service</h1>
        <p className="text-sm text-[#6b7280] mb-8">Last updated: May 31, 2026</p>

        <div className="bg-white rounded-2xl shadow-lg border border-[#e5e7eb] p-8 space-y-6 text-[#374151] leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">1. Acceptance of Terms</h2>
            <p className="text-sm">
              By accessing or using Sizzling Hub's website, mobile application, or any related services
              (collectively, the "Service"), you agree to be bound by these Terms of Service
              ("Terms"). If you do not agree to these Terms, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">2. Description of Service</h2>
            <p className="text-sm">
              Sizzling Hub provides an online food ordering platform that allows users to browse menus,
              place orders, and manage their accounts. We reserve the right to modify, suspend, or
              discontinue any part of the Service at any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">3. User Accounts</h2>
            <p className="text-sm">
              To access certain features of the Service, you must create an account. You are responsible
              for maintaining the confidentiality of your account credentials and for all activities that
              occur under your account. You agree to provide accurate, current, and complete information
              during registration and to update such information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">4. Orders and Payments</h2>
            <p className="text-sm">
              All orders placed through the Service are subject to acceptance and availability. Prices are
              subject to change without notice. You agree to pay all charges incurred in connection with
              your account, including applicable taxes and delivery fees.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">5. Prohibited Conduct</h2>
            <p className="text-sm">
              You agree not to: (a) use the Service for any unlawful purpose; (b) interfere with or
              disrupt the Service or servers; (c) impersonate any person or entity; (d) engage in any
              activity that could damage, disable, or impair the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">6. Intellectual Property</h2>
            <p className="text-sm">
              All content, trademarks, and intellectual property on the Service are owned by Sizzling Hub
              or its licensors. You may not reproduce, distribute, or create derivative works without
              express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">7. Limitation of Liability</h2>
            <p className="text-sm">
              To the fullest extent permitted by law, Sizzling Hub shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">8. Changes to Terms</h2>
            <p className="text-sm">
              We reserve the right to update these Terms at any time. Changes will be effective immediately
              upon posting. Your continued use of the Service after any modifications constitutes acceptance
              of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">9. Contact</h2>
            <p className="text-sm">
              For questions about these Terms, please contact us at{" "}
              <a href="mailto:support@sizzlinghub.com" className="text-[#dc2626] hover:text-[#b91c1c] underline transition-colors">
                support@sizzlinghub.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
