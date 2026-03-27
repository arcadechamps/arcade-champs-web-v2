import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const PrivacyPolicy = () => {
  const heroRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up" });

  return (
    <Layout>
      <PageMeta
        title="Privacy Policy"
        description="Privacy Policy for Arcade Champs. Learn how we collect, use, and protect your personal data on our skill-based retro gaming platform."
        canonicalUrl="/privacy"
      />

      <section className="bg-grid py-20">
        <div ref={heroRef} className="container max-w-3xl text-center">
          <span className="mb-3 inline-block font-arcade text-[10px] text-accent">LEGAL</span>
          <h1 className="mb-6 font-arcade text-xl leading-relaxed text-foreground md:text-2xl">
            Privacy <span className="text-primary text-glow-blue">Policy</span>
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: March 17, 2026</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container max-w-3xl space-y-10">

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">1. INFORMATION WE COLLECT</h2>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                <strong className="text-foreground">Account Data:</strong> When you sign up, we collect your email address, display name, and username. If you upload an avatar, we store that image.
              </p>
              <p>
                <strong className="text-foreground">Gameplay Data:</strong> During contest sessions, we collect gameplay recordings, periodic screenshots, scores, session timestamps, and anti-cheat telemetry. This data is reviewed by our <strong className="text-foreground">AI-powered analysis systems</strong> to verify score legitimacy and detect cheating.
              </p>
              <p>
                <strong className="text-foreground">Payment Information:</strong> Payments are processed by Stripe. We do not store your full credit card number. We receive and store transaction IDs, amounts, and payment status from Stripe for wallet reconciliation.
              </p>
              <p>
                <strong className="text-foreground">Device & Usage Data:</strong> We automatically collect browser type, operating system, IP address, pages visited, and session duration for analytics and security purposes.
              </p>
            </div>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">2. HOW WE USE YOUR INFORMATION</h2>
            <ul className="ml-4 list-disc space-y-1 text-sm leading-relaxed text-muted-foreground">
              <li>To operate and maintain your account and wallet.</li>
              <li>To process contest entries, calculate leaderboards, and distribute winnings.</li>
              <li>To run AI-powered anti-cheat analysis on gameplay recordings and screenshots to ensure fair competition.</li>
              <li>To detect and prevent fraud, abuse, and violations of our Terms of Service.</li>
              <li>To communicate with you about your account, contests, and platform updates.</li>
              <li>To improve the Platform through aggregated, anonymized analytics.</li>
            </ul>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">3. COOKIES & ANALYTICS</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We use essential cookies to maintain your authenticated session. We may use analytics services to understand how the Platform is used. These tools may set their own cookies. You can control cookie preferences through your browser settings, but disabling essential cookies may prevent you from using the Platform.
            </p>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">4. DATA SHARING</h2>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>We do not sell your personal data. We share data only with:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li><strong className="text-foreground">Stripe:</strong> For payment processing (wallet top-ups and payouts).</li>
                <li><strong className="text-foreground">Supabase:</strong> Our backend infrastructure provider for database and authentication services.</li>
                <li><strong className="text-foreground">AI Analysis Services:</strong> Gameplay recordings and screenshots are processed by AI systems for anti-cheat review and score verification.</li>
                <li><strong className="text-foreground">Law Enforcement:</strong> If required by law or to protect the rights and safety of our users and platform.</li>
              </ul>
            </div>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">5. DATA RETENTION</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Account data is retained as long as your account is active. Gameplay recordings and screenshots from contest sessions are retained for up to 90 days after the contest ends for anti-cheat review purposes. Payment records are retained as required by applicable financial regulations. You may request deletion of your account data at any time (see Your Rights below).
            </p>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">6. YOUR RIGHTS</h2>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>Depending on your jurisdiction, you may have the right to:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong className="text-foreground">Deletion:</strong> Request that we delete your account and associated personal data.</li>
                <li><strong className="text-foreground">Export:</strong> Request your data in a portable, machine-readable format.</li>
                <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate personal data.</li>
                <li><strong className="text-foreground">Objection:</strong> Object to certain types of data processing.</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{" "}
                <a href="mailto:privacy@arcadechamps.com" className="text-primary hover:underline">
                  privacy@arcadechamps.com
                </a>.
              </p>
            </div>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">7. CHILDREN'S PRIVACY</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The Platform's paid features are not intended for users under 18. We do not knowingly collect personal information from children under 13. If we discover that we have collected data from a child under 13, we will delete it promptly. If you believe a child has provided us with personal information, please contact us immediately.
            </p>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">8. CHANGES TO THIS POLICY</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We may update this Privacy Policy from time to time. Material changes will be communicated via email or a prominent notice on the Platform. Your continued use after changes are posted constitutes acceptance of the updated policy.
            </p>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">9. CONTACT</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              If you have questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:privacy@arcadechamps.com" className="text-primary hover:underline">
                privacy@arcadechamps.com
              </a>.
            </p>
          </article>

        </div>
      </section>
    </Layout>
  );
};

export default PrivacyPolicy;
