import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-[#dc2626] hover:text-[#b91c1c] transition-colors mb-8"
        >
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-black text-[#0a0a0a] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#6b7280] mb-8">Last updated: May 31, 2026</p>

        <div className="bg-white rounded-2xl shadow-lg border border-[#e5e7eb] p-8 space-y-6 text-[#374151] leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">1. Information We Collect</h2>
            <p className="text-sm">
              We collect information you provide directly to us, including your name, email address,
              phone number, delivery address, and payment information when you create an account or
              place an order. We also automatically collect certain technical information when you use
              our Service, such as your IP address, browser type, and device information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">2. How We Use Your Information</h2>
            <p className="text-sm">
              We use the information we collect to: (a) process and fulfill your orders; (b) communicate
              with you about your account and orders; (c) improve and personalize our Service; (d) send
              you marketing communications (with your consent); and (e) comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">3. Information Sharing</h2>
            <p className="text-sm">
              We do not sell your personal information. We may share your information with third-party
              service providers who help us operate our business, such as payment processors, delivery
              partners, and hosting providers. These providers are contractually bound to protect your
              information and use it only for the services they provide to us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">4. Data Security</h2>
            <p className="text-sm">
              We implement reasonable technical and organizational measures to protect your personal
              information against unauthorized access, alteration, disclosure, or destruction. However,
              no method of transmission over the Internet or electronic storage is 100% secure, and we
              cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">5. Cookies</h2>
            <p className="text-sm">
              We use cookies and similar tracking technologies to enhance your experience on our Service.
              Cookies help us remember your preferences, understand how you use our site, and improve
              our offerings. You can control cookie preferences through your browser settings at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">6. Your Rights</h2>
            <p className="text-sm">
              Depending on your jurisdiction, you may have the right to access, correct, delete, or
              port your personal data. You may also have the right to opt out of certain data processing
              activities. To exercise these rights, please contact us using the information provided below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">7. Data Retention</h2>
            <p className="text-sm">
              We retain your personal information for as long as necessary to fulfill the purposes
              described in this policy, unless a longer retention period is required or permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">8. Children's Privacy</h2>
            <p className="text-sm">
              Our Service is not directed to individuals under the age of 13. We do not knowingly
              collect personal information from children. If we become aware that a child has provided
              us with personal data, we will take steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">9. Changes to This Policy</h2>
            <p className="text-sm">
              We may update this Privacy Policy from time to time. We will notify you of any material
              changes by posting the new policy on this page and updating the "Last updated" date.
              Your continued use of the Service after changes are posted constitutes acceptance of the
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">10. Contact Us</h2>
            <p className="text-sm">
              If you have questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:privacy@sizzlinghub.com" className="text-[#dc2626] hover:text-[#b91c1c] underline transition-colors">
                support@sizzlinghub.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}