import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const TermsOfService = () => {
  const heroRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up" });

  return (
    <Layout>
      <PageMeta
        title="Terms of Service"
        description="Terms of Service for Arcade Champs, the skill-based retro gaming platform. Read about contest rules, payments, fair play, and anti-cheat policies."
        canonicalUrl="/terms"
      />

      <section className="bg-grid py-20">
        <div ref={heroRef} className="container max-w-3xl text-center">
          <span className="mb-3 inline-block font-arcade text-[10px] text-accent">LEGAL</span>
          <h1 className="mb-6 font-arcade text-xl leading-relaxed text-foreground md:text-2xl">
            Terms of <span className="text-primary text-glow-blue">Service</span>
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: March 17, 2026</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container max-w-3xl space-y-10">

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">1. ACCEPTANCE OF TERMS</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              By accessing or using Arcade Champs ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, you must stop using the Platform immediately. We reserve the right to update these terms at any time; continued use constitutes acceptance of any changes.
            </p>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">2. ELIGIBILITY</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You must be at least 18 years old (or the age of majority in your jurisdiction) to create an account, enter paid contests, or use any payment features. Users under 18 may access free-play games only with parental consent. By creating an account, you represent that you meet these age requirements.
            </p>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">3. ACCOUNT RULES</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Each user may maintain only one account. You are responsible for keeping your login credentials secure. Sharing accounts, using another person's account, or creating multiple accounts to gain a competitive advantage is strictly prohibited and may result in immediate termination.
            </p>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">4. CONTESTS & PAYMENT TERMS</h2>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                <strong className="text-foreground">Entry Fees:</strong> Certain contests require a per-session entry fee deducted from your wallet balance. Fees are displayed before you start a session and are non-refundable once the session begins.
              </p>
              <p>
                <strong className="text-foreground">Wallet Top-Ups:</strong> You may add funds to your wallet via Stripe. All transactions are processed in USD. Top-up amounts are credited after successful payment verification.
              </p>
              <p>
                <strong className="text-foreground">Withdrawals & Payouts:</strong> Contest winnings are credited to your wallet. Withdrawal requests are subject to identity verification and anti-cheat review. We reserve the right to withhold payouts if fraudulent activity is suspected.
              </p>
              <p>
                <strong className="text-foreground">Refund Policy:</strong> Wallet top-ups are generally non-refundable. Refunds may be issued at our sole discretion in cases of technical failure that prevented gameplay. Entry fees for sessions that were not started due to a platform error will be automatically refunded.
              </p>
            </div>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">5. FAIR PLAY & ANTI-CHEAT</h2>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Arcade Champs is committed to fair competition. All contest gameplay is monitored by our anti-cheat systems, which include <strong className="text-foreground">AI-powered review and analysis</strong> of gameplay recordings, screenshots, and score patterns to determine the legitimacy of submitted scores.
              </p>
              <p>
                <strong className="text-foreground">Prohibited conduct includes, but is not limited to:</strong>
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Using cheat engines, memory editors, speed hacks, or any third-party software to manipulate game state or scores.</li>
                <li>Exploiting bugs or glitches to gain an unfair advantage over other players.</li>
                <li>Using automated scripts, bots, or macros to play games.</li>
                <li>Submitting scores achieved on a modified or tampered game client.</li>
                <li>Colluding with other players to manipulate contest outcomes.</li>
                <li>Attempting to reverse-engineer, decompile, or tamper with the Platform's anti-cheat systems.</li>
                <li>Creating multiple accounts to enter the same contest more than the allowed number of times.</li>
              </ul>
              <p>
                <strong className="text-foreground">Consequences:</strong> If our AI review system or manual investigation determines that your gameplay is suspicious or fraudulent, your account may be flagged, your scores invalidated, your winnings forfeited, and your account temporarily suspended or permanently banned — at our sole discretion and without prior notice.
              </p>
            </div>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">6. INTELLECTUAL PROPERTY</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              All Platform content — including logos, design, software, and text — is owned by or licensed to Arcade Champs. Retro game ROMs are provided for entertainment purposes under applicable fair-use provisions. You may not reproduce, distribute, or create derivative works from any Platform content without our written permission.
            </p>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">7. LIMITATION OF LIABILITY</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The Platform is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Arcade Champs shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform, including but not limited to loss of data, loss of winnings, or interruption of service.
            </p>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">8. TERMINATION</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We may suspend or terminate your account at any time for violation of these terms, suspected fraud, or any conduct we deem harmful to the Platform or its community. Upon termination, any remaining wallet balance may be forfeited if the termination is due to fraudulent activity.
            </p>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">9. GOVERNING LAW</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              These terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration in accordance with applicable arbitration rules, unless prohibited by local law.
            </p>
          </article>

          <article>
            <h2 className="mb-3 font-arcade text-[11px] text-foreground">10. CONTACT</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              If you have questions about these Terms of Service, please contact us at{" "}
              <a href="mailto:support@arcadechamps.com" className="text-primary hover:underline">
                support@arcadechamps.com
              </a>.
            </p>
          </article>

        </div>
      </section>
    </Layout>
  );
};

export default TermsOfService;
